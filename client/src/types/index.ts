export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer' | 'operator';
}

export interface Transaction {
  _id: string;
  amount: number;
  description: string;
  category: string;
  type: 'inflow' | 'outflow';
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  reference?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  amount: number;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  _id: string;
  name: string;
  accountNumber: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit';
  status: 'active' | 'inactive';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type: 'expense' | 'income';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  _id: string;
  title: string;
  type: 'income' | 'expense' | 'cash_flow' | 'summary';
  startDate: string;
  endDate: string;
  data: Record<string, any>;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  _id: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  currentSpending: number;
  alertThreshold: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransaction {
  _id: string;
  amount: number;
  description: string;
  category: string;
  type: 'inflow' | 'outflow';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: string;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id: string;
  transactionId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

// The refresh token is set as an HttpOnly cookie, not returned in the body.
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
