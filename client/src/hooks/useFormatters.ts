import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { DEFAULT_PREFERENCES, formatCurrency, formatDate } from '../utils/format';

/** Currency and date formatters that follow the signed-in user's preferences. */
export const useFormatters = () => {
  const { user } = useAuth();
  const prefs = { ...DEFAULT_PREFERENCES, ...user?.preferences };

  return useMemo(
    () => ({
      currency: prefs.currency,
      money: (amount: number | undefined | null) => formatCurrency(amount, prefs.currency),
      date: (value: string | Date | undefined | null) => formatDate(value, prefs.dateFormat),
    }),
    [prefs.currency, prefs.dateFormat]
  );
};
