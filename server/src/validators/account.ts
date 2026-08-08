import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name required'),
  accountNumber: z.string().min(1, 'Account number required'),
  balance: z.number().default(0),
  currency: z.string().default('USD'),
  type: z.enum(['checking', 'savings', 'credit']),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
