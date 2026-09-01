import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import env from '../config/env';
import { ValidationError } from '../utils/errors';

// The __Host- prefix requires the Secure attribute unconditionally — browsers
// (and curl) silently refuse to store such a cookie over plain HTTP. Only use
// the prefix when we can actually satisfy it (HTTPS_ONLY), so local/HTTP
// testing isn't silently broken.
const CSRF_COOKIE_NAME = env.HTTPS_ONLY ? '__Host-csrf-token' : 'csrf-token';

export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction): void => {
  // Generate CSRF token
  const token = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', env.CSRF_TOKEN_SECRET)
    .update(token)
    .digest('hex');

  const fullToken = `${token}.${signature}`;

  // Set as HttpOnly cookie (server-side half of the double-submit check)
  res.cookie(CSRF_COOKIE_NAME, fullToken, {
    httpOnly: true,
    secure: env.HTTPS_ONLY,
    // Client and server are deployed on different origins, so the cookie
    // must be SameSite=None to be sent at all; that requires Secure, which
    // is why this is tied to HTTPS_ONLY (must be true in production).
    sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Expose the plaintext token so the SPA can echo it back as the
  // x-csrf-token header — the cookie itself stays HttpOnly and unreadable
  // to client JS, which is what makes the double-submit check meaningful.
  res.set('x-csrf-token', token);

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
