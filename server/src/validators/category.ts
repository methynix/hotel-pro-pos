import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['expense', 'income']),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
