import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';
import { Category } from '../models/Category';
import { fromMinor } from '../utils/money';

// Figures cover completed income and expense transactions only: pending
// ones haven't happened yet, and transfers just move money between the
// organization's own accounts. All results are in major units.

interface DashboardMetrics {
  totalInflows: number;
  totalExpenses: number;
  netCashFlow: number;
  accountBalance: number;
  transactionCount: number;
  pendingCount: number;
  inflowsChange: number;
  expensesChange: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

interface DailyTrend {
  date: string;
  inflow: number;
  outflow: number;
}

const oid = (id: string) => new mongoose.Types.ObjectId(id);

/** Income and expense totals (minor units) between two dates. */
async function totals(organizationId: string, from: Date, to?: Date) {
  const rows = await Transaction.aggregate<{ _id: string; total: number; count: number }>([
    {
      $match: {
        organizationId: oid(organizationId),
        status: 'completed',
        isVoided: { $ne: true },
        type: { $in: ['income', 'expense'] },
        transactionDate: to ? { $gte: from, $lt: to } : { $gte: from },
      },
    },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const get = (type: string) => rows.find((r) => r._id === type);
  return {
    income: get('income')?.total ?? 0,
    expense: get('expense')?.total ?? 0,
    count: (get('income')?.count ?? 0) + (get('expense')?.count ?? 0),
  };
}

const percentChange = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : 0;

export const analyticsService = {
  async getDashboardMetrics(organizationId: string, timeframe: 'month' | 'quarter' | 'year' = 'month'): Promise<DashboardMetrics> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const previousStartDate = new Date(startDate);
    switch (timeframe) {
      case 'quarter':
        previousStartDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        previousStartDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        previousStartDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const [current, previous, accounts, pendingCount] = await Promise.all([
      totals(organizationId, startDate),
      totals(organizationId, previousStartDate, startDate),
      Account.find({ organizationId, status: 'active' }),
      Transaction.countDocuments({ organizationId, status: 'pending', isVoided: { $ne: true } }),
    ]);

    // Money held in checking and savings, less what is owed on credit.
    const accountBalance = accounts.reduce(
      (sum, a) => sum + (a.type === 'credit' ? -a.currentBalance : a.currentBalance),
      0
    );

    return {
      totalInflows: fromMinor(current.income),
      totalExpenses: fromMinor(current.expense),
      netCashFlow: fromMinor(current.income - current.expense),
      accountBalance: fromMinor(accountBalance),
      transactionCount: current.count,
      pendingCount,
      inflowsChange: percentChange(current.income, previous.income),
      expensesChange: percentChange(current.expense, previous.expense),
    };
  },

  async getTopCategories(organizationId: string, limit = 5): Promise<CategorySpending[]> {
    const rows = await Transaction.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { organizationId: oid(organizationId), type: 'expense', status: 'completed', isVoided: { $ne: true } } },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);
    const categories = await Category.find({ _id: { $in: rows.map((r) => r._id) } }).select('name');
    const names = new Map(categories.map((c) => [c._id.toString(), c.name]));
    const totalSpending = rows.reduce((sum, r) => sum + r.total, 0);

    return rows.slice(0, limit).map((r) => ({
      category: names.get(r._id?.toString()) ?? 'Uncategorized',
      amount: fromMinor(r.total),
      percentage: totalSpending > 0 ? (r.total / totalSpending) * 100 : 0,
    }));
  },

  async getCashFlowTrend(organizationId: string, days = 30): Promise<DailyTrend[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const rows = await Transaction.aggregate<{ _id: { day: string; type: string }; total: number }>([
      {
        $match: {
          organizationId: oid(organizationId),
          status: 'completed',
          isVoided: { $ne: true },
          type: { $in: ['income', 'expense'] },
          transactionDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const trend: Record<string, DailyTrend> = {};
    for (let i = 0; i < days; i++) {
      const dateStr = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      trend[dateStr] = { date: dateStr, inflow: 0, outflow: 0 };
    }
    for (const row of rows) {
      const day = trend[row._id.day];
      if (!day) continue;
      if (row._id.type === 'income') day.inflow += fromMinor(row.total);
      else day.outflow += fromMinor(row.total);
    }

    return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
  },

  async getMonthlyComparison(organizationId: string): Promise<Record<string, { inflow: number; outflow: number; net: number }>> {
    const now = new Date();
    const monthConfigs = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      return { start, end, monthKey };
    });

    const results = await Promise.all(
      monthConfigs.map(async ({ start, end, monthKey }) => {
        const t = await totals(organizationId, start, end);
        return {
          monthKey,
          data: {
            inflow: fromMinor(t.income),
            outflow: fromMinor(t.expense),
            net: fromMinor(t.income - t.expense),
          },
        };
      })
    );

    const months: Record<string, { inflow: number; outflow: number; net: number }> = {};
    for (const { monthKey, data } of results) {
      months[monthKey] = data;
    }

    return months;
  },
};
