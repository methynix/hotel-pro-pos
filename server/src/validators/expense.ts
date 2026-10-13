import { z } from 'zod';
import { positiveMoney } from '../utils/money';
import { objectId } from '../utils/validate';

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
