import { z } from 'zod';

const roleSchema = z.enum(['admin', 'manager', 'viewer', 'operator']);

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleSchema.default('viewer'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  // Admin-initiated password reset; hashed by the model's pre-save hook.
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
