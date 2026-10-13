export type UserRole = 'admin' | 'manager' | 'viewer' | 'operator';

export interface UserPreferences {
  currency: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  emailNotifications: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  baseCurrency: string;
}

export interface OrganizationMembership extends OrganizationSummary {
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** Role in the active organization; null when the user isn't in one. */
  role: UserRole | null;
  organization: OrganizationSummary | null;
  organizations: OrganizationMembership[];
  isActive?: boolean;
  preferences?: UserPreferences;
  createdAt?: string;
}

/** A member of the active organization. */
export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  joinedAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface Invitation {
  _id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationPreview {
  email: string;
  role: UserRole;
  organizationName: string;
  invitedBy: string;
  expiresAt: string;
  existingUser: boolean;
}

export interface Organization {
  _id: string;
  name: string;
  baseCurrency: string;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  description: string;
  /** Income and expense only. */
  accountId?: string;
  categoryId?: string;
  /** Transfers only. */
  fromAccountId?: string;
  toAccountId?: string;
  /** When the money moved; createdAt is only when it was recorded. */
  transactionDate: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  reference?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  amount: number;
  description: string;
  categoryId: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  _id: string;
  name: string;
  accountNumber: string;
  /** What the account held before any recorded transaction. */
  openingBalance: number;
  /** Kept in step with transactions by the server. For credit accounts, the amount owed. */
  currentBalance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit';
  status: 'active' | 'inactive';
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
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  _id: string;
  title: string;
  type: 'income' | 'expense' | 'cash_flow' | 'balance' | 'tax' | 'summary';
  startDate: string;
  endDate: string;
  data: Record<string, any>;
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
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransaction {
  _id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  accountId: string;
  categoryId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: string;
  lastExecuted?: string;
  /** Why the last scheduled run failed, e.g. the account was deactivated. */
  lastError?: string;
  isActive: boolean;
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

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta?: { pagination?: Pagination };
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface ListParams {
  page?: number;
  limit?: number;
}

export type TransactionFilters = ListParams;
export type ExpenseFilters = ListParams;

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
  organizationName: string;
}

// The refresh token is set as an HttpOnly cookie, not returned in the body.
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AppNotification {
  _id: string;
  category: 'account' | 'security' | 'budget' | 'summary';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  emailed: boolean;
  createdAt: string;
}
