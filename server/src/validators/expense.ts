import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z.number().min(0, 'Amount must be positive'),
  description: z.string().min(1, 'Description required'),
  category: z.string().min(1, 'Category required'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  notes: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
