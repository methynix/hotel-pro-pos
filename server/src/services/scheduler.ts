import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Expense } from '../models/Expense';
import { Category } from '../models/Category';
import { Organization } from '../models/Organization';
import { notificationService } from './notificationService';
import { recurringTransactionService } from './recurringTransactionService';
import { fromMinor } from '../utils/money';

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // Tanzania is UTC+3 all year
const SEND_HOUR_EAT = 8; // Mondays at 08:00 EAT
const CHECK_EVERY_MS = 60 * 60 * 1000;

const tzs = (minor: number) =>
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(fromMinor(minor));

/** The most recent Monday 08:00 EAT at or before `now`, as a UTC Date. */
function lastSendSlot(now: Date): Date {
  const eat = new Date(now.getTime() + EAT_OFFSET_MS);
  const daysSinceMonday = (eat.getUTCDay() + 6) % 7;
  const slot = new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate() - daysSinceMonday, SEND_HOUR_EAT));
  if (slot.getTime() > eat.getTime()) slot.setUTCDate(slot.getUTCDate() - 7);
  return new Date(slot.getTime() - EAT_OFFSET_MS);
}

async function sendWeeklySummaries(): Promise<void> {
  const slot = lastSendSlot(new Date());
  // Only send during the first day after the slot, so a long outage doesn't
  // trigger stale summaries days later.
  if (Date.now() - slot.getTime() > 24 * 60 * 60 * 1000) return;

  const users = await User.find({
    isActive: true,
    'preferences.weeklySummary': true,
    $or: [{ lastWeeklySummaryAt: { $exists: false } }, { lastWeeklySummaryAt: { $lt: slot } }],
  });

  const weekStart = new Date(slot.getTime() - 7 * 24 * 60 * 60 * 1000);
  for (const user of users) {
    // The summary covers the organization the user is currently working in.
    const organizationId = user.activeOrganizationId;
    if (!organizationId) continue;
    try {
      const [org, transactions, pendingExpenses, categories] = await Promise.all([
        Organization.findById(organizationId).select('name'),
        Transaction.find({
          organizationId,
          status: 'completed',
          type: { $in: ['income', 'expense'] },
          transactionDate: { $gte: weekStart, $lt: slot },
        }),
        Expense.countDocuments({ organizationId, status: 'pending' }),
        Category.find({ organizationId }).select('name'),
      ]);
      const names = new Map(categories.map((c) => [c._id.toString(), c.name]));
      const inflow = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const outflow = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const byCategory: Record<string, number> = {};
      transactions
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const name = names.get(t.categoryId?.toString() ?? '') ?? 'Uncategorized';
          byCategory[name] = (byCategory[name] || 0) + t.amount;
        });
      const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

      await notificationService.notify(user, {
        category: 'summary',
        title: `Weekly summary for ${org?.name ?? 'your organization'}`,
        message: `Last week: ${tzs(inflow)} in, ${tzs(outflow)} out, net ${tzs(inflow - outflow)} across ${transactions.length} transactions.`,
        link: '/app',
        email: {
          subject: `ledgerHQ weekly summary: net ${tzs(inflow - outflow)}`,
          paragraphs: ["Here's how the last seven days looked."],
          rows: [
            { label: 'Money in', value: tzs(inflow) },
            { label: 'Money out', value: tzs(outflow) },
            { label: 'Net', value: tzs(inflow - outflow) },
            { label: 'Transactions', value: String(transactions.length) },
            ...(top ? [{ label: 'Biggest spend', value: `${top[0]} (${tzs(top[1])})` }] : []),
            { label: 'Expenses awaiting approval', value: String(pendingExpenses) },
          ],
          actionLabel: 'Open dashboard',
        },
      });
      await User.updateOne({ _id: user._id }, { lastWeeklySummaryAt: new Date() });
    } catch (error) {
      console.error(`Weekly summary for ${user.email} failed:`, error instanceof Error ? error.message : error);
    }
  }
}

async function runRecurringTransactions(): Promise<void> {
  const created = await recurringTransactionService.executeDue();
  if (created > 0) console.log(`🔁 Posted ${created} recurring transaction(s)`);
}

export function startScheduler(): () => void {
  const run = () => {
    runRecurringTransactions().catch((e) => console.error('Recurring transactions error:', e));
    sendWeeklySummaries().catch((e) => console.error('Scheduler error:', e));
  };
  run();
  const timer = setInterval(run, CHECK_EVERY_MS);
  return () => clearInterval(timer);
}
