import { Request } from 'express';

interface SecurityEvent {
  type: 'failed_login' | 'permission_denied' | 'invalid_token' | 'suspicious_activity';
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export const securityLogger = {
  logFailedLogin(email: string, ipAddress: string, userAgent?: string) {
    const event: SecurityEvent = {
      type: 'failed_login',
      email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };
    console.warn('[SECURITY]', JSON.stringify(event));
  },

  logPermissionDenied(userId: string, resource: string, ipAddress: string) {
    const event: SecurityEvent = {
      type: 'permission_denied',
      userId,
      ipAddress,
      timestamp: new Date(),
      details: { resource },
    };
    console.warn('[SECURITY]', JSON.stringify(event));
  },

  logInvalidToken(ipAddress: string, token?: string) {
    const event: SecurityEvent = {
      type: 'invalid_token',
      ipAddress,
      timestamp: new Date(),
      details: { tokenHash: token ? token.substring(0, 10) + '...' : 'none' },
    };
    console.warn('[SECURITY]', JSON.stringify(event));
  },
};
