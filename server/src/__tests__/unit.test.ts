import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { toMinor, fromMinor, formatMinor, positiveMoney, signedMoney } from '../utils/money';
import { voidTransactionSchema } from '../validators/transaction';
import { payExpenseSchema, rejectExpenseSchema } from '../validators/expense';

test('Money utilities: precision and minor/major unit conversions', async (t) => {
  await t.test('converts major currency to minor units without float drift', () => {
    assert.strictEqual(toMinor(1500.25), 150025);
    assert.strictEqual(toMinor(0.01), 1);
    assert.strictEqual(toMinor(0), 0);
    assert.strictEqual(toMinor(19.99), 1999);
  });

  await t.test('converts minor units back to major units', () => {
    assert.strictEqual(fromMinor(150025), 1500.25);
    assert.strictEqual(fromMinor(1), 0.01);
    assert.strictEqual(fromMinor(0), 0);
    assert.strictEqual(fromMinor(undefined), 0);
    assert.strictEqual(fromMinor(null), 0);
  });

  await t.test('formats minor units to readable currency string', () => {
    const formatted = formatMinor(850050, 'TZS');
    assert.match(formatted, /TZS/);
    assert.match(formatted, /8,500/);
  });

  await t.test('validates positive money input with zod', () => {
    const parsed = positiveMoney.parse(50.5);
    assert.strictEqual(parsed, 5050);

    assert.throws(() => positiveMoney.parse(-10));
    assert.throws(() => positiveMoney.parse(0));
    assert.throws(() => positiveMoney.parse(NaN));
  });

  await t.test('validates signed money input allowing negative balances', () => {
    const pos = signedMoney.parse(100);
    assert.strictEqual(pos, 10000);

    const neg = signedMoney.parse(-250);
    assert.strictEqual(neg, -25000);

    const zero = signedMoney.parse(0);
    assert.strictEqual(zero, 0);
  });
});

test('Transaction & Expense Validators', async (t) => {
  await t.test('voidTransactionSchema requires minimum reason length', () => {
    assert.throws(() => voidTransactionSchema.parse({ reason: 'no' }));
    const valid = voidTransactionSchema.parse({ reason: 'Duplicate entry submitted in error' });
    assert.strictEqual(valid.reason, 'Duplicate entry submitted in error');
  });

  await t.test('payExpenseSchema validates accountId and optional fields', () => {
    assert.throws(() => payExpenseSchema.parse({ accountId: 'invalid-id' }));
    const valid = payExpenseSchema.parse({
      accountId: '507f1f77bcf86cd799439011',
      paymentMethod: 'Bank Transfer',
      reference: 'TX-99881',
    });
    assert.strictEqual(valid.accountId, '507f1f77bcf86cd799439011');
    assert.strictEqual(valid.paymentMethod, 'Bank Transfer');
  });

  await t.test('rejectExpenseSchema validates reason', () => {
    const empty = rejectExpenseSchema.parse({});
    assert.strictEqual(empty.reason, undefined);

    const withReason = rejectExpenseSchema.parse({ reason: 'Budget exceeded for Q3' });
    assert.strictEqual(withReason.reason, 'Budget exceeded for Q3');
  });
});

test('CSRF Security & HMAC Validation', async (t) => {
  const secret = 'test-secret-at-least-32-chars-long-for-hmac-sha256';

  function safeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  function verifyCsrfToken(fullToken: unknown): string | null {
    if (typeof fullToken !== 'string') return null;
    const dotIndex = fullToken.indexOf('.');
    if (dotIndex === -1) return null;
    const token = fullToken.slice(0, dotIndex);
    const signature = fullToken.slice(dotIndex + 1);
    if (!token || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('hex');

    if (safeCompare(signature, expectedSignature)) {
      return token;
    }
    return null;
  }

  await t.test('verifies valid HMAC signed CSRF tokens', () => {
    const token = crypto.randomBytes(32).toString('hex');
    const signature = crypto.createHmac('sha256', secret).update(token).digest('hex');
    const fullToken = `${token}.${signature}`;

    const verified = verifyCsrfToken(fullToken);
    assert.strictEqual(verified, token);
  });

  await t.test('rejects tampered or forged CSRF tokens', () => {
    const token = crypto.randomBytes(32).toString('hex');
    const forgedToken = `${token}.invalid-signature-1234567890abcdef`;
    assert.strictEqual(verifyCsrfToken(forgedToken), null);
    assert.strictEqual(verifyCsrfToken('malformed'), null);
    assert.strictEqual(verifyCsrfToken(''), null);
  });
});

test('User Email Validation Regex', async (t) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  await t.test('accepts modern domains and TLDs of any valid length', () => {
    assert.ok(emailRegex.test('info@methynix.com'));
    assert.ok(emailRegex.test('manager@grandhotel.hotel'));
    assert.ok(emailRegex.test('pos@resort.online'));
    assert.ok(emailRegex.test('accounting@company.technology'));
    assert.ok(emailRegex.test('finance@co.tz'));
  });

  await t.test('rejects invalid email formats', () => {
    assert.ok(!emailRegex.test('plainaddress'));
    assert.ok(!emailRegex.test('@missingusername.com'));
    assert.ok(!emailRegex.test('username@.com'));
    assert.ok(!emailRegex.test('user name@domain.com'));
  });
});

test('Analytics Timeframe Comparison Calculation', async (t) => {
  const getPreviousStartDate = (startDate: Date, timeframe: 'month' | 'quarter' | 'year') => {
    const prev = new Date(startDate);
    switch (timeframe) {
      case 'quarter':
        prev.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        prev.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        prev.setMonth(startDate.getMonth() - 1);
        break;
    }
    return prev;
  };

  await t.test('quarter subtracts 3 months', () => {
    const start = new Date(2026, 6, 1); // July 1
    const prev = getPreviousStartDate(start, 'quarter');
    assert.strictEqual(prev.getMonth(), 3); // April 1
  });

  await t.test('year subtracts 1 full year', () => {
    const start = new Date(2026, 6, 1);
    const prev = getPreviousStartDate(start, 'year');
    assert.strictEqual(prev.getFullYear(), 2025);
    assert.strictEqual(prev.getMonth(), 6);
  });

  await t.test('month subtracts 1 month', () => {
    const start = new Date(2026, 6, 1);
    const prev = getPreviousStartDate(start, 'month');
    assert.strictEqual(prev.getMonth(), 5); // June 1
  });
});

