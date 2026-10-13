import { z } from 'zod';
import { ValidationError } from './errors';

/** Parses a request body with a zod schema, throwing the first issue as a 400. */
export const parse = <S extends z.ZodType>(schema: S, body: unknown): z.output<S> => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message || 'Invalid input');
  }
  return result.data;
};

export const objectId = (label: string) => z.string({ message: `Choose ${label}` }).regex(/^[a-f\d]{24}$/i, `Choose ${label}`);

/** Accepts an ISO date or YYYY-MM-DD string. */
export const dateInput = z.coerce.date({ message: 'Enter a valid date' });
