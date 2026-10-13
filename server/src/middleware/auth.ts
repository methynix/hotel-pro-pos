import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { User } from '../models/User';
import { AppError, AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserRole } from '../types/api';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        /** Role in the active organization; undefined when the user has none. */
        role?: UserRole;
        organizationId?: string;
      };
    }
  }
}

/**
 * Verifies the access token, then loads the user's active organization and
 * role from the database. Roles are deliberately not trusted from the token,
 * so a role change or removal from an organization takes effect immediately.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthenticationError('No authorization token provided');
    }

    const payload = authService.verifyToken(token);
    const user = await User.findById(payload.userId)
      .select('email isActive organizations activeOrganizationId')
      .lean();
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid or expired token');
    }

    const activeId = user.activeOrganizationId?.toString();
    const membership = activeId
      ? user.organizations?.find((m) => m.organizationId.toString() === activeId)
      : undefined;

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: membership?.role,
      organizationId: membership ? activeId : undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/** Rejects requests from users who aren't currently in an organization. */
export const requireOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }
  if (!req.user.organizationId) {
    return next(new AppError(403, 'Create or join an organization first', 'NO_ORGANIZATION'));
  }
  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};

/** Query filter that confines a lookup to the caller's organization. */
export const orgScope = (req: Request) => ({ organizationId: req.user!.organizationId! });

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
