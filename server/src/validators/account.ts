import { z } from 'zod';
import { signedMoney } from '../utils/money';

const fields = {
  name: z.string().trim().min(1, 'Account name required').max(100),
  accountNumber: z.string().trim().min(1, 'Account number required').max(50),
  // The balance before any recorded transaction. The current balance is
  // derived by the ledger and can't be set directly.
  openingBalance: signedMoney,
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code').toUpperCase(),
  type: z.enum(['checking', 'savings', 'credit']),
  status: z.enum(['active', 'inactive']),
};

export const createAccountSchema = z.object({
  ...fields,
  openingBalance: fields.openingBalance.default(0),
  currency: fields.currency.default('TZS'),
  status: fields.status.default('active'),
});

export const updateAccountSchema = z.object(fields).partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
