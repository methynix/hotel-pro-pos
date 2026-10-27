import { Budget, IBudget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { notificationService } from './notificationService';
import { organizationService } from './organizationService';
import { fromMinor } from '../utils/money';

const tzs = (minor: number) =>
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(fromMinor(minor));

/** The calendar period containing `now`: this month, quarter or year. */
export function currentPeriod(period: IBudget['period'], now = new Date()): { startDate: Date; endDate: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const [start, months] = period === 'yearly' ? [0, 12] : period === 'quarterly' ? [Math.floor(m / 3) * 3, 3] : [m, 1];
  return {
    startDate: new Date(y, start, 1),
    endDate: new Date(y, start + months, 0, 23, 59, 59, 999),
  };
}

interface BudgetStatus {
  budgetAmount: number;
  currentSpending: number;
  percentageUsed: number;
  isAlertTriggered: boolean;
  remaining: number;
  startDate: Date;
  endDate: Date;
}

/** Completed expense spending against a budget in its current period, in minor units. */
async function spendingFor(budget: IBudget, startDate: Date, endDate: Date): Promise<number> {
  const [row] = await Transaction.aggregate<{ total: number }>([
    {
      $match: {
        organizationId: budget.organizationId,
        categoryId: (budget.categoryId as any)?._id ?? budget.categoryId,
        type: 'expense',
        status: 'completed',
        isVoided: { $ne: true },
        transactionDate: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return row?.total ?? 0;
}

/** Status in minor units; used internally for alerts. */
async function statusMinor(budget: IBudget) {
  const { startDate, endDate } = currentPeriod(budget.period);
  const spent = await spendingFor(budget, startDate, endDate);
  const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  if (spent !== budget.currentSpending) {
    await Budget.updateOne({ _id: budget._id }, { currentSpending: spent, startDate, endDate });
  }
  return { spent, percentageUsed, isAlertTriggered: percentageUsed >= budget.alertThreshold, startDate, endDate };
}

/** Status in major units, for API responses. */
async function status(budget: IBudget): Promise<BudgetStatus> {
  const s = await statusMinor(budget);
  return {
    budgetAmount: fromMinor(budget.amount),
    currentSpending: fromMinor(s.spent),
    percentageUsed: s.percentageUsed,
    isAlertTriggered: s.isAlertTriggered,
    remaining: fromMinor(budget.amount - s.spent),
    startDate: s.startDate,
    endDate: s.endDate,
  };
}

export const budgetService = {
  currentPeriod,

  async getActive(organizationId: string): Promise<IBudget[]> {
    return Budget.find({ organizationId, isActive: true }).populate('categoryId').sort({ createdAt: -1 });
  },

  async getById(id: string, organizationId: string): Promise<IBudget | null> {
    return Budget.findOne({ _id: id, organizationId }).populate('categoryId');
  },

  status,

  /** Each active budget merged with its live status, ready for the client. */
  async getAllWithStatus(organizationId: string) {
    const budgets = await this.getActive(organizationId);
    return Promise.all(budgets.map(async (b) => ({ ...b.toJSON(), ...(await status(b)) })));
  },

  async getAlerts(organizationId: string) {
    const budgets = await this.getActive(organizationId);
    const alerts = [];
    for (const budget of budgets) {
      const s = await statusMinor(budget);
      if (s.isAlertTriggered) {
        alerts.push({
          budgetId: budget._id,
          category: (budget.categoryId as any)?.name,
          message: `You've used ${s.percentageUsed.toFixed(1)}% of your ${budget.period} budget`,
          severity: s.percentageUsed >= 100 ? 'critical' : 'warning',
          percentageUsed: s.percentageUsed,
        });
      }
    }
    return alerts;
  },

  /**
   * Alerts the organization's admins and managers the first time spending
   * crosses a budget's threshold, and re-arms once spending drops back under.
   * Safe to call after any transaction change; never throws.
   */
  async checkAndNotify(organizationId: string): Promise<void> {
    try {
      const budgets = await this.getActive(organizationId);
      for (const budget of budgets) {
        const s = await statusMinor(budget);

        if (s.isAlertTriggered && !budget.alertNotifiedAt) {
          const category = (budget.categoryId as any)?.name || 'a category';
          const over = s.percentageUsed >= 100;
          const recipients = await organizationService.membersWithRoles(organizationId, ['admin', 'manager']);
          await Promise.all(
            recipients.map((user) =>
              notificationService.notify(user, {
                category: 'budget',
                title: over ? `${category} budget exceeded` : `${category} budget at ${s.percentageUsed.toFixed(0)}%`,
                message: over
                  ? `You have spent ${tzs(s.spent)} of your ${budget.period} ${category} budget of ${tzs(budget.amount)}.`
                  : `You have used ${s.percentageUsed.toFixed(0)}% of your ${budget.period} ${category} budget (${tzs(s.spent)} of ${tzs(budget.amount)}).`,
                link: '/app/budgets',
                email: {
                  rows: [
                    { label: 'Budget', value: tzs(budget.amount) },
                    { label: 'Spent', value: tzs(s.spent) },
                    { label: over ? 'Over by' : 'Remaining', value: tzs(Math.abs(budget.amount - s.spent)) },
                    { label: 'Used', value: `${s.percentageUsed.toFixed(1)}%` },
                  ],
                  actionLabel: 'View budgets',
                },
              })
            )
          );
          await Budget.updateOne({ _id: budget._id }, { alertNotifiedAt: new Date() });
        } else if (!s.isAlertTriggered && budget.alertNotifiedAt) {
          await Budget.updateOne({ _id: budget._id }, { $unset: { alertNotifiedAt: 1 } });
        }
      }
    } catch (error) {
      console.error('Budget alert check failed:', error instanceof Error ? error.message : error);
    }
  },
};
