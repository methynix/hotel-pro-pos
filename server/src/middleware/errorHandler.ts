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
    // NO: userId, body, password, tokens, etc.
  });

  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message);
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
