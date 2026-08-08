export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    version: string;
    path: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: {
    timestamp: string;
    version: string;
    path: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export type UserRole = 'admin' | 'manager' | 'viewer' | 'operator';

export interface AuthRequest {
  userId: string;
  role: UserRole;
  email: string;
}
