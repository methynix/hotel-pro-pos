import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { authService } from '../services/authService';
import { securityLogger } from '../services/securityLogger';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/errors';
import { sendSuccess, sendError } from '../utils/response';
import env from '../config/env';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || 'unknown';

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user and select password
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        securityLogger.logFailedLogin(email, ipAddress, req.get('user-agent'));
        return authService.getGenericAuthError();
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        securityLogger.logFailedLogin(email, ipAddress, req.get('user-agent'));
        return authService.getGenericAuthError();
      }

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      // Set refresh token in HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.HTTPS_ONLY,
        sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, 200, {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password || !name) {
        throw new ValidationError('Email, password, and name are required');
      }

      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters');
      }

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create user
      const user = await User.create({
        email: email.toLowerCase(),
        password,
        name,
        role: 'viewer',
      });

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.HTTPS_ONLY,
        sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, 201, {
        accessToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      sendSuccess(res, 200, {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.HTTPS_ONLY,
        sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
      });
      sendSuccess(res, 200, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },
};
