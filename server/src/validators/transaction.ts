import { z } from 'zod';
import { positiveMoney } from '../utils/money';
import { dateInput, objectId } from '../utils/validate';

const fields = {
  type: z.enum(['income', 'expense', 'transfer']),
  amount: positiveMoney,
  description: z.string().trim().min(1, 'Description required').max(500),
  accountId: objectId('an account').optional(),
  categoryId: objectId('a category').optional(),
  fromAccountId: objectId('the account to transfer from').optional(),
  toAccountId: objectId('the account to transfer to').optional(),
  transactionDate: dateInput,
  status: z.enum(['completed', 'pending', 'failed']),
  paymentMethod: z.string().trim().max(50).optional(),
  reference: z.string().trim().max(100).optional(),
};

// Type-specific requirements (account vs. from/to) are checked by the ledger.
export const createTransactionSchema = z.object({
  ...fields,
  transactionDate: fields.transactionDate.default(() => new Date()),
  status: fields.status.default('completed'),
});

export const updateTransactionSchema = z.object(fields).partial();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
