import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

const jsonLimiterHandler = (message: string) => (req: any, res: any) => {
  sendError(res, 429, 'TOO_MANY_REQUESTS', message);
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimiterHandler('Too many attempts, please try again later'),
});

export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimiterHandler('Too many invitation requests, please try again later'),
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimiterHandler('Too many requests, please slow down'),
});
