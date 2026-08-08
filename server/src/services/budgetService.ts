import { Budget, IBudget } from '../models/Budget';
import { Transaction } from '../models/Transaction';

export const budgetService = {
  async createBudget(data: Partial<IBudget>): Promise<IBudget> {
    return Budget.create(data);
  },

  async getBudgetsByUser(userId: string): Promise<IBudget[]> {
    return Budget.find({ userId, isActive: true }).populate('categoryId').sort({ createdAt: -1 });
  },

  async getBudgetById(id: string, userId: string): Promise<IBudget | null> {
    return Budget.findOne({ _id: id, userId }).populate('categoryId');
  },

  async updateBudget(id: string, userId: string, data: Partial<IBudget>): Promise<IBudget | null> {
    return Budget.findOneAndUpdate({ _id: id, userId }, data, { new: true }).populate('categoryId');
  },

  async deleteBudget(id: string, userId: string): Promise<boolean> {
    const result = await Budget.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  },

  async calculateBudgetStatus(budgetId: string, userId: string): Promise<{
    budgetAmount: number;
    currentSpending: number;
    percentageUsed: number;
    isAlertTriggered: boolean;
    remaining: number;
  } | null> {
    const budget = await this.getBudgetById(budgetId, userId);
    if (!budget) return null;

    const transactions = await Transaction.find({
      userId,
      category: budget.categoryId.toString(),
      type: 'outflow',
      createdAt: { $gte: budget.startDate, $lte: budget.endDate },
    });

    const currentSpending = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const percentageUsed = (currentSpending / budget.amount) * 100;
    const isAlertTriggered = percentageUsed >= budget.alertThreshold;

    // Update budget with current spending
    await Budget.findByIdAndUpdate(budgetId, { currentSpending });

    return {
      budgetAmount: budget.amount,
      currentSpending,
      percentageUsed,
      isAlertTriggered,
      remaining: budget.amount - currentSpending,
    };
  },

  async getAllBudgetStatus(userId: string): Promise<any[]> {
    const budgets = await this.getBudgetsByUser(userId);

    const statuses = await Promise.all(
      budgets.map(async budget => {
        const status = await this.calculateBudgetStatus(budget._id.toString(), userId);
        return {
          ...budget.toObject(),
          ...status,
        };
      })
    );

    return statuses;
  },

  async getAlertsForUser(userId: string): Promise<any[]> {
    const budgets = await this.getBudgetsByUser(userId);
    const alerts = [];

    for (const budget of budgets) {
      const status = await this.calculateBudgetStatus(budget._id.toString(), userId);
      if (status && status.isAlertTriggered) {
        alerts.push({
          budgetId: budget._id,
          category: (budget.categoryId as any).name,
          message: `You've used ${status.percentageUsed.toFixed(1)}% of your ${budget.period} budget`,
          severity: status.percentageUsed >= 100 ? 'critical' : 'warning',
          percentageUsed: status.percentageUsed,
        });
      }
    }

    return alerts;
  },
};
