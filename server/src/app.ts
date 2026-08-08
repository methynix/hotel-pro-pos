import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { csrfTokenGenerator, csrfTokenValidator } from './middleware/csrf';
import { sendSuccess } from './utils/response';

const app: Application = express();

// ============ Security Middleware ============
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(compression());

app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-csrf-token'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ============ CSRF Protection ============
app.use(csrfTokenGenerator);

// ============ Routes ============
// Health check (no auth needed)
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }, 'Server is running');
}));

// Auth routes (no auth needed)
// TODO: Create auth routes

// Protected routes (require auth)
app.use('/api/v1', csrfTokenValidator);
app.use('/api/v1', authenticate);
// TODO: Create protected routes

// ============ 404 Handler ============
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ============ Error Handler ============
app.use(errorHandler);

export default app;
