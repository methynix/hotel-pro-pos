import { UserPreferences } from '../types';

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'TZS',
  dateFormat: 'MM/DD/YYYY',
  emailNotifications: true,
  budgetAlerts: true,
  weeklySummary: false,
};

// Shillings are quoted without cents, with the local "TSh" symbol.
const CURRENCY_FORMATS: Record<string, { locale: string; digits: number }> = {
  TZS: { locale: 'en-TZ', digits: 0 },
  UGX: { locale: 'en-UG', digits: 0 },
  KES: { locale: 'en-KE', digits: 2 },
  JPY: { locale: 'ja-JP', digits: 0 },
};

export const formatCurrency = (amount: number | undefined | null, currency = 'TZS'): string => {
  const value = Number(amount) || 0;
  const { locale, digits } = CURRENCY_FORMATS[currency] ?? { locale: 'en-US', digits: 2 };
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
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

/** Today's date in the user's timezone, as YYYY-MM-DD for date inputs. */
export const todayInput = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Calendar dates (transaction dates, next run dates) are sent as noon UTC,
// so they land on the same day whatever the viewer's timezone.
export const dateInputToApi = (value: string): string => `${value}T12:00:00.000Z`;
export const apiToDateInput = (value: string | undefined | null): string => (value ? value.slice(0, 10) : '');

export const capitalize =(value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');

/** Pulls a readable message out of anything the API layer can throw. */
export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string =>
  (error as { message?: string })?.message || fallback;
