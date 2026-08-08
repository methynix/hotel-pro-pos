import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().min(0, 'Amount must be positive'),
  description: z.string().min(1, 'Description required'),
  category: z.string().min(1, 'Category required'),
  type: z.enum(['inflow', 'outflow']),
  status: z.enum(['completed', 'pending', 'failed']).default('completed'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
