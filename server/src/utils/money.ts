import { z } from 'zod';

// Money is stored as integer minor units (cents) so balances never drift
// from floating-point rounding: 1,500.25 TZS is stored as 150025. The API
// speaks in major units; convert only at these edges.
export const toMinor = (major: number): number => Math.round(major * 100);
export const fromMinor = (minor: number | undefined | null): number => (minor ?? 0) / 100;

/** Schema field for a stored minor-unit amount. */
export const minorUnits = (options: { required?: boolean; min?: number; default?: number } = {}) => ({
  type: Number,
  ...options,
  validate: { validator: Number.isInteger, message: 'Amounts must be stored in whole minor units' },
});

/**
 * toJSON options that turn the named minor-unit fields back into major
 * units, so every API response carries ordinary amounts.
 */
export const moneyJSON = (fields: string[]) => ({
  transform(_doc: unknown, ret: Record<string, any>) {
    for (const field of fields) {
      if (typeof ret[field] === 'number') ret[field] = fromMinor(ret[field]);
    }
    return ret;
  },
});

/** Human-readable amount for messages and audit summaries, e.g. "TZS 85,000.50". */
export const formatMinor = (minor: number, currency = 'TZS'): string =>
  `${currency} ${fromMinor(minor).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const MAX_AMOUNT = 1e13; // well inside Number.MAX_SAFE_INTEGER once in cents

/** A positive amount in major units from the client, converted to minor units. */
export const positiveMoney = z
  .number({ message: 'Amount must be a number' })
  .finite()
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT, 'Amount is too large')
  .transform(toMinor)
  .refine((v) => v > 0, 'Amount must be at least 0.01');

/** Any amount (zero or negative allowed), e.g. an opening balance. */
export const signedMoney = z
  .number({ message: 'Amount must be a number' })
  .finite()
  .min(-MAX_AMOUNT, 'Amount is too large')
  .max(MAX_AMOUNT, 'Amount is too large')
  .transform(toMinor);
