import { z } from 'zod';
import { positiveMoney } from '../utils/money';
import { dateInput, objectId } from '../utils/validate';

const fields = {
  amount: positiveMoney,
  description: z.string().trim().min(1, 'Description required').max(500),
  type: z.enum(['income', 'expense']),
  accountId: objectId('an account'),
  categoryId: objectId('a category'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  nextDate: dateInput,
  isActive: z.boolean(),
};

export const createRecurringSchema = z.object({ ...fields, isActive: fields.isActive.default(true) });
export const updateRecurringSchema = z.object(fields).partial();
