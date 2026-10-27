import { Request, Response, NextFunction } from 'express';
import { Expense, IExpense, ExpenseStatus } from '../models/Expense';
import { Category } from '../models/Category';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { orgScope } from '../middleware/auth';
import { CAN_APPROVE, hasRole } from '../config/permissions';
import { parse } from '../utils/validate';
import { formatMinor } from '../utils/money';
import { actorFrom, auditService } from '../services/auditService';
import { ledgerService } from '../services/ledgerService';
import { budgetService } from '../services/budgetService';
import { notificationService } from '../services/notificationService';
import {
  createExpenseSchema,
  editExpenseSchema,
  payExpenseSchema,
  rejectExpenseSchema,
} from '../validators/expense';

// Workflow: pending -> approved -> paid, or pending -> rejected.
// Only paying touches the ledger. Every transition is a conditional update on
// the current status, so a double-click or two managers acting at once can
// only ever apply it once.

async function assertExpenseCategory(req: Request, categoryId: string) {
  const category = await Category.findOne({ _id: categoryId, ...orgScope(req) });
  if (!category) throw new ValidationError('Category was not found');
  if (category.type !== 'expense') throw new ValidationError(`${category.name} is not an expense category`);
}

const label = (e: Pick<IExpense, 'description' | 'amount'>) => `"${e.description}" (${formatMinor(e.amount)})`;

/** Explains why a guarded transition found nothing to change. */
async function transitionError(req: Request, id: string, action: string): Promise<Error> {
  const current = await Expense.findOne({ _id: id, ...orgScope(req) }).select('status');
  if (!current) return new NotFoundError('Expense');
  return new ConflictError(`This expense is already ${current.status}, so it can't be ${action}`);
}

/** Moves an expense from one status to another, atomically, and logs it. */
async function transition(req: Request, from: ExpenseStatus, to: ExpenseStatus, extra: Record<string, unknown> = {}) {
  const before = await Expense.findOne({ _id: req.params.id, ...orgScope(req) });
  const updated = await Expense.findOneAndUpdate(
    { _id: req.params.id, ...orgScope(req), status: from },
    { status: to, reviewedBy: req.user!.userId, reviewedAt: new Date(), ...extra },
    { new: true }
  );
  if (!updated) throw await transitionError(req, req.params.id as string, to);
  await auditService.record(actorFrom(req), {
    action: `expense.${to}`,
    entityType: 'expense',
    entityId: updated._id,
    summary: `${to === 'approved' ? 'Approved' : 'Rejected'} expense ${label(updated)}${extra.notes ? `: ${extra.notes}` : ''}`,
    before,
    after: updated,
  });
  return updated;
}

export const expenseController = {
  // Everyone in the organization sees all of its expenses, which is what
  // lets managers find and approve what operators submit.
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 500);
      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        Expense.find(orgScope(req)).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Expense.countDocuments(orgScope(req)),
      ]);

      sendPaginated(res, 200, expenses, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createExpenseSchema, req.body);
      // Approvers may log an already-approved expense; everyone else submits
      // for approval. Nobody can create one as paid: that goes through /pay.
      const canApprove = hasRole(req.user?.role, CAN_APPROVE);
      const status = canApprove && input.status === 'approved' ? 'approved' : 'pending';
      await assertExpenseCategory(req, input.categoryId);

      const expense = await Expense.create({
        ...input,
        status,
        ...orgScope(req),
        createdBy: req.user!.userId,
        ...(status === 'approved' ? { reviewedBy: req.user!.userId, reviewedAt: new Date() } : {}),
      });
      sendSuccess(res, 201, expense);

      auditService.record(actorFrom(req), {
        action: 'expense.created',
        entityType: 'expense',
        entityId: expense._id,
        summary: `Submitted expense ${label(expense)}${status === 'approved' ? ' as approved' : ' for approval'}`,
        after: expense,
      });
    } catch (error) {
      next(error);
    }
  },

  /** Edits the details of an expense that hasn't been decided yet. */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(editExpenseSchema, req.body);
      if (changes.categoryId) await assertExpenseCategory(req, changes.categoryId);

      const before = await Expense.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!before) throw new NotFoundError('Expense');
      const updated = await Expense.findOneAndUpdate(
        { _id: req.params.id, ...orgScope(req), status: 'pending' },
        changes,
        { new: true, runValidators: true }
      );
      if (!updated) throw new ConflictError(`This expense is already ${before.status}, so it can no longer be edited`);
      sendSuccess(res, 200, updated);

      auditService.record(actorFrom(req), {
        action: 'expense.updated',
        entityType: 'expense',
        entityId: updated._id,
        summary: `Edited expense ${label(updated)}`,
        before,
        after: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await transition(req, 'pending', 'approved');
      sendSuccess(res, 200, expense);
      notificationService.notify(expense.createdBy.toString(), {
        category: 'account',
        title: 'Expense approved',
        message: `Your expense ${label(expense)} was approved and is waiting to be paid.`,
        link: '/app/expenses',
      });
    } catch (error) {
      next(error);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = parse(rejectExpenseSchema, req.body);
      const expense = await transition(req, 'pending', 'rejected', reason ? { notes: reason } : {});
      sendSuccess(res, 200, expense);
      notificationService.notify(expense.createdBy.toString(), {
        category: 'account',
        title: 'Expense rejected',
        message: `Your expense ${label(expense)} was rejected${reason ? `: ${reason}` : '.'}`,
        link: '/app/expenses',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Pays an approved expense: records the expense transaction against the
   * chosen account and marks the expense paid, in one MongoDB transaction.
   * The status:'approved' condition means a second click finds nothing to
   * pay, so money can only leave the account once.
   */
  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(payExpenseSchema, req.body);
      const actor = actorFrom(req);

      const paid = await ledgerService.inTransaction(async (session) => {
        const expense = await Expense.findOneAndUpdate(
          { _id: req.params.id, ...orgScope(req), status: 'approved' },
          { status: 'paid', paidBy: req.user!.userId, paidAt: new Date(), accountId: input.accountId },
          { new: true, session }
        );
        if (!expense) throw await transitionError(req, req.params.id as string, 'paid');

        const tx = await ledgerService.create(
          actor,
          {
            type: 'expense',
            amount: expense.amount,
            description: expense.description,
            accountId: input.accountId,
            categoryId: expense.categoryId.toString(),
            transactionDate: input.paidDate ?? new Date(),
            status: 'completed',
            paymentMethod: input.paymentMethod,
            reference: input.reference,
            expenseId: expense._id.toString(),
          },
          { session }
        );
        expense.transactionId = tx._id;
        await expense.save({ session });

        await auditService.record(
          actor,
          {
            action: 'expense.paid',
            entityType: 'expense',
            entityId: expense._id,
            summary: `Paid expense ${label(expense)}`,
            after: expense,
          },
          session
        );
        return expense;
      });

      sendSuccess(res, 200, paid);
      budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },

  /** Paid expenses stay: their money is in the ledger. Void the payment first. */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await Expense.findOneAndDelete({ _id: req.params.id, ...orgScope(req), status: { $ne: 'paid' } });
      if (!deleted) {
        const exists = await Expense.exists({ _id: req.params.id, ...orgScope(req) });
        throw exists
          ? new ConflictError('This expense has been paid. Void its transaction first if the payment was a mistake.')
          : new NotFoundError('Expense');
      }
      sendSuccess(res, 200, { message: 'Expense deleted' });

      auditService.record(actorFrom(req), {
        action: 'expense.deleted',
        entityType: 'expense',
        entityId: deleted._id,
        summary: `Deleted ${deleted.status} expense ${label(deleted)}`,
        before: deleted,
      });
    } catch (error) {
      next(error);
    }
  },
};
