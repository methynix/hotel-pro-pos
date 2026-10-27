import { z } from 'zod';
import { positiveMoney } from '../utils/money';
import { dateInput, objectId } from '../utils/validate';

const fields = {
  amount: positiveMoney,
  description: z.string().trim().min(1, 'Description required').max(500),
  categoryId: objectId('a category'),
  status: z.enum(['pending', 'approved', 'rejected']),
  notes: z.string().trim().max(1000).optional(),
};

export const createExpenseSchema = z.object({ ...fields, status: fields.status.default('pending') });
export const updateExpenseSchema = z.object(fields).partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// Edits never change status; approval, rejection and payment have their own
// endpoints so each transition can be guarded.
export const editExpenseSchema = updateExpenseSchema.omit({ status: true });

export const rejectExpenseSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const payExpenseSchema = z.object({
  accountId: objectId('the account to pay from'),
  paidDate: dateInput.optional(),
  paymentMethod: z.string().trim().max(50).optional(),
  reference: z.string().trim().max(100).optional(),
});
