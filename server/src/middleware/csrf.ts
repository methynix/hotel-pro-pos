import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import env from '../config/env';
import { ValidationError } from '../utils/errors';

const CSRF_COOKIE_NAME = '__Host-csrf-token';

export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction): void => {
  // Generate CSRF token
  const token = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', env.CSRF_TOKEN_SECRET)
    .update(token)
    .digest('hex');

  const fullToken = `${token}.${signature}`;

  // Set as HttpOnly cookie
  res.cookie(CSRF_COOKIE_NAME, fullToken, {
    httpOnly: true,
    secure: env.HTTPS_ONLY,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  next();
};

export const csrfTokenValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for GET requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  if (!token) {
    throw new ValidationError('CSRF token required', { csrf: 'Missing CSRF token' });
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  if (!cookieToken) {
    throw new ValidationError('CSRF token missing from cookies');
  }

  // Verify token signature
  const [cookieTokenValue, cookieSignature] = cookieToken.split('.');
  const expectedSignature = crypto
    .createHmac('sha256', env.CSRF_TOKEN_SECRET)
    .update(cookieTokenValue)
    .digest('hex');

  if (cookieSignature !== expectedSignature || token !== cookieTokenValue) {
    throw new ValidationError('Invalid CSRF token');
  }

  next();
};
