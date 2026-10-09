import { UserPreferences } from '../types';

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  emailNotifications: true,
  budgetAlerts: true,
  weeklySummary: false,
};

export const formatCurrency = (amount: number | undefined | null, currency = 'USD'): string => {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export const formatDate = (
  value: string | Date | undefined | null,
  format: UserPreferences['dateFormat'] = 'MM/DD/YYYY'
): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  switch (format) {
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
};

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');

/** Pulls a readable message out of anything the API layer can throw. */
export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string =>
  (error as { message?: string })?.message || fallback;
