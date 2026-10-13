import { z } from 'zod';

const roleSchema = z.enum(['admin', 'manager', 'operator', 'viewer']);

export const organizationNameSchema = z.string().trim().min(2, 'Organization name must be at least 2 characters').max(120);

export const createOrganizationSchema = z.object({ name: organizationNameSchema });

export const updateOrganizationSchema = z.object({
  name: organizationNameSchema.optional(),
  baseCurrency: z.string().trim().length(3, 'Currency must be a 3-letter code').toUpperCase().optional(),
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid organization'),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: roleSchema.default('viewer'),
});

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateMemberSchema = z.object({ role: roleSchema });
