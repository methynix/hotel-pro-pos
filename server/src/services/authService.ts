import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import env from '../config/env';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/errors';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  },

  // Verify password
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  // Generate JWT tokens
  generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY,
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256',
    });

    return { accessToken, refreshToken };
  },

  // Verify JWT token
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  },

  // Generic error for login attempts (prevent account enumeration)
  getGenericAuthError(): never {
    throw new AuthenticationError('Invalid email or password');
  },
};
