import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error securely (don't log sensitive data)
  console.error('Error:', {
    message: error.message,
    code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
    path: req.path,
    method: req.method,
  });

  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message);
    return;
  }

  // Mongo duplicate key (e.g. a reused account number or email)
  if ((error as any)?.code === 11000) {
    const field = Object.keys((error as any).keyValue || {})[0] || 'value';
    sendError(res, 409, 'CONFLICT', `That ${field} is already in use`);
    return;
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    const first = Object.values((error as any).errors || {})[0] as { message?: string } | undefined;
    sendError(res, 400, 'VALIDATION_ERROR', first?.message || 'Invalid input');
    return;
  }

  // Generic error response (never expose implementation details)
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
