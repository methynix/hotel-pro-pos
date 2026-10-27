import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import env from '../config/env';
import { ValidationError } from '../utils/errors';

// The __Host- prefix requires the Secure attribute unconditionally — browsers
// (and curl) silently refuse to store such a cookie over plain HTTP. Only use
// the prefix when we can actually satisfy it (HTTPS_ONLY), so local/HTTP
// testing isn't silently broken.
const CSRF_COOKIE_NAME = env.HTTPS_ONLY ? '__Host-csrf-token' : 'csrf-token';

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyCsrfToken(fullToken: unknown): string | null {
  if (typeof fullToken !== 'string') return null;
  const dotIndex = fullToken.indexOf('.');
  if (dotIndex === -1) return null;
  const token = fullToken.slice(0, dotIndex);
  const signature = fullToken.slice(dotIndex + 1);
  if (!token || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', env.CSRF_TOKEN_SECRET)
    .update(token)
    .digest('hex');

  if (safeCompare(signature, expectedSignature)) {
    return token;
  }
  return null;
}

export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction): void => {
  // If the request already includes a valid CSRF cookie, reuse the token so
  // parallel/concurrent requests don't overwrite each other's cookie.
  const existingCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const validToken = verifyCsrfToken(existingCookie);

  if (validToken) {
    res.set('x-csrf-token', validToken);
    return next();
  }

  // Generate a new CSRF token
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
    sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (Express expects ms)
  });

  // Expose the plaintext token so the SPA can echo it back as the
  // x-csrf-token header — the cookie itself stays HttpOnly and unreadable
  // to client JS, which is what makes the double-submit check meaningful.
  res.set('x-csrf-token', token);

  next();
};

export const csrfTokenValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  if (!token) {
    throw new ValidationError('CSRF token required', { csrf: 'Missing CSRF token' });
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!cookieToken) {
    throw new ValidationError('CSRF token missing from cookies');
  }

  const validToken = verifyCsrfToken(cookieToken);
  if (!validToken || !safeCompare(token, validToken)) {
    throw new ValidationError('Invalid CSRF token');
  }

  next();
};
