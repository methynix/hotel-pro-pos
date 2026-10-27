import { RecurringTransaction } from '../models/RecurringTransaction';
import { ledgerService } from './ledgerService';
import { budgetService } from './budgetService';
import { SYSTEM_ACTOR } from './auditService';

const MAX_CATCH_UP = 31; // runs per entry per sweep, so a long outage can't flood the ledger

export const recurringTransactionService = {
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

  /**
   * Posts every due occurrence to the ledger. Each occurrence and the
   * advance of `nextDate` commit together, so a crash can't double-post.
   * Returns how many transactions were created.
   */
  async executeDue(now = new Date()): Promise<number> {
    const due = await RecurringTransaction.find({ isActive: true, nextDate: { $lte: now } });
    let count = 0;
    const touchedOrgs = new Set<string>();

    for (const recurring of due) {
      try {
        for (let i = 0; i < MAX_CATCH_UP && recurring.nextDate <= now; i++) {
          const occurrence = recurring.nextDate;
          await ledgerService.inTransaction(async (session) => {
            await ledgerService.create(
              SYSTEM_ACTOR(recurring.organizationId.toString()),
              {
                type: recurring.type,
                amount: recurring.amount,
                description: recurring.description,
                accountId: recurring.accountId.toString(),
                categoryId: recurring.categoryId.toString(),
                transactionDate: occurrence,
                status: 'completed',
                paymentMethod: 'Recurring',
                recurringTransactionId: recurring._id.toString(),
              },
              { session, createdBy: recurring.createdBy.toString() }
            );
            recurring.lastExecuted = occurrence;
            recurring.nextDate = this.calculateNextDate(recurring.frequency, occurrence);
            recurring.lastError = undefined;
            await recurring.save({ session });
          });
          count++;
          touchedOrgs.add(recurring.organizationId.toString());
        }
      } catch (error) {
        // e.g. the account was deactivated. Keep the entry, record why, and
        // retry on the next sweep once someone fixes it.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Recurring transaction ${recurring._id} failed:`, message);
        await RecurringTransaction.updateOne({ _id: recurring._id }, { lastError: message });
      }
    }

    for (const organizationId of touchedOrgs) await budgetService.checkAndNotify(organizationId);
    return count;
  },
};
