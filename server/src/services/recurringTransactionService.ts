import { RecurringTransaction, IRecurringTransaction } from '../models/RecurringTransaction';
import { Transaction } from '../models/Transaction';

export const recurringTransactionService = {
  async createRecurring(data: Partial<IRecurringTransaction>): Promise<IRecurringTransaction> {
    return RecurringTransaction.create(data);
  },

  async getRecurringByUser(userId: string): Promise<IRecurringTransaction[]> {
    return RecurringTransaction.find({ userId, isActive: true }).sort({ nextDate: 1 });
  },

  async getRecurringById(id: string, userId: string): Promise<IRecurringTransaction | null> {
    return RecurringTransaction.findOne({ _id: id, userId });
  },

  async updateRecurring(id: string, userId: string, data: Partial<IRecurringTransaction>): Promise<IRecurringTransaction | null> {
    return RecurringTransaction.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  },

  async toggleRecurring(id: string, userId: string): Promise<IRecurringTransaction | null> {
    const recurring = await this.getRecurringById(id, userId);
    if (!recurring) return null;
    return RecurringTransaction.findByIdAndUpdate(id, { isActive: !recurring.isActive }, { new: true });
  },

  async deleteRecurring(id: string, userId: string): Promise<boolean> {
    const result = await RecurringTransaction.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  },

  calculateNextDate(frequency: string, currentDate: Date): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  },

  async executeRecurringTransactions(): Promise<number> {
    const now = new Date();
    const dueTransactions = await RecurringTransaction.find({
      isActive: true,
      nextDate: { $lte: now },
    });

    let count = 0;

    for (const recurring of dueTransactions) {
      try {
        await Transaction.create({
          amount: recurring.amount,
          description: recurring.description,
          category: recurring.category,
          type: recurring.type,
          status: 'completed',
          paymentMethod: 'auto',
          userId: recurring.userId,
        });

        const nextDate = this.calculateNextDate(recurring.frequency, now);
        await RecurringTransaction.findByIdAndUpdate(recurring._id, {
          nextDate,
          lastExecuted: now,
        });

        count++;
      } catch (error) {
        console.error(`Failed to execute recurring transaction ${recurring._id}:`, error);
      }
    }

    return count;
  },
};
