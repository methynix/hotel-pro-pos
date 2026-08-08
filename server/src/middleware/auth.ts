import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { AuthRequest, UserRole } from '../types/api';

declare global {
  namespace Express {
    interface Request {
      user?: AuthRequest;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthenticationError('No authorization token provided');
    }

    const payload = authService.verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};

function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try HttpOnly cookie
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}
