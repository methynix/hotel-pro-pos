import { z } from 'zod';
import { positiveMoney } from '../utils/money';
import { objectId } from '../utils/validate';

const fields = {
  categoryId: objectId('a category'),
  amount: positiveMoney,
  period: z.enum(['monthly', 'quarterly', 'yearly']),
  alertThreshold: z.number().min(1).max(100),
  isActive: z.boolean(),
};

export const createBudgetSchema = z.object({
  ...fields,
  period: fields.period.default('monthly'),
  alertThreshold: fields.alertThreshold.default(80),
  isActive: fields.isActive.default(true),
});
export const updateBudgetSchema = z.object(fields).partial();
