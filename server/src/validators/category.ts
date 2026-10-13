import { z } from 'zod';

const fields = {
  name: z.string().trim().min(1, 'Category name required').max(60),
  description: z.string().trim().max(300).optional(),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
  type: z.enum(['expense', 'income']),
};

export const createCategorySchema = z.object(fields);
export const updateCategorySchema = z.object(fields).partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
