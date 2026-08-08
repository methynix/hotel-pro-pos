import { Transaction } from '../models/Transaction';
import { Expense } from '../models/Expense';
import { Account } from '../models/Account';
import { Category } from '../models/Category';

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

export const analyticsService = {
  async getDashboardMetrics(userId: string, timeframe: 'month' | 'quarter' | 'year' = 'month'): Promise<DashboardMetrics> {
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
    previousStartDate.setMonth(startDate.getMonth() - 1);

    // Current period transactions
    const currentTransactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate },
    });

    const currentInflows = currentTransactions
      .filter(t => t.type === 'inflow')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentOutflows = currentTransactions
      .filter(t => t.type === 'outflow')
      .reduce((sum, t) => sum + t.amount, 0);

    // Previous period transactions for comparison
    const previousTransactions = await Transaction.find({
      userId,
      createdAt: { $gte: previousStartDate, $lt: startDate },
    });

    const previousInflows = previousTransactions
      .filter(t => t.type === 'inflow')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousOutflows = previousTransactions
      .filter(t => t.type === 'outflow')
      .reduce((sum, t) => sum + t.amount, 0);

    const inflowsChange = previousInflows > 0 ? ((currentInflows - previousInflows) / previousInflows) * 100 : 0;
    const expensesChange = previousOutflows > 0 ? ((currentOutflows - previousOutflows) / previousOutflows) * 100 : 0;

    // Account balance
    const accounts = await Account.find({ userId });
    const accountBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const pendingTransactions = await Transaction.countDocuments({
      userId,
      status: 'pending',
    });

    return {
      totalInflows: currentInflows,
      totalExpenses: currentOutflows,
      netCashFlow: currentInflows - currentOutflows,
      accountBalance,
      transactionCount: currentTransactions.length,
      pendingCount: pendingTransactions,
      inflowsChange,
      expensesChange,
    };
  },

  async getTopCategories(userId: string, limit = 5): Promise<CategorySpending[]> {
    const categories = await Category.find({ userId });
    const transactions = await Transaction.find({ userId });

    const spending: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type === 'outflow' && tx.category) {
        spending[tx.category] = (spending[tx.category] || 0) + tx.amount;
      }
    });

    const totalSpending = Object.values(spending).reduce((a, b) => a + b, 0);

    return Object.entries(spending)
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c._id.toString() === categoryId);
        return {
          category: category?.name || 'Unknown',
          amount,
          percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  },

  async getCashFlowTrend(userId: string, days = 30): Promise<DailyTrend[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate },
    });

    const trend: Record<string, DailyTrend> = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trend[dateStr] = { date: dateStr, inflow: 0, outflow: 0 };
    }

    // Aggregate transactions by day
    transactions.forEach(tx => {
      const dateStr = tx.createdAt.toISOString().split('T')[0];
      if (trend[dateStr]) {
        if (tx.type === 'inflow') {
          trend[dateStr].inflow += tx.amount;
        } else {
          trend[dateStr].outflow += tx.amount;
        }
      }
    });

    return Object.values(trend).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async getMonthlyComparison(userId: string): Promise<Record<string, any>> {
    const now = new Date();
    const months: Record<string, any> = {};

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const transactions = await Transaction.find({
        userId,
        createdAt: { $gte: date, $lte: monthEnd },
      });

      const inflow = transactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
      const outflow = transactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

      months[monthKey] = {
        inflow,
        outflow,
        net: inflow - outflow,
      };
    }

    return months;
  },
};
