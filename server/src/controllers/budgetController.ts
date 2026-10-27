import { Request, Response, NextFunction } from 'express';
import { Budget } from '../models/Budget';
import { Category } from '../models/Category';
import { budgetService } from '../services/budgetService';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { orgScope } from '../middleware/auth';
import { parse } from '../utils/validate';
import { formatMinor } from '../utils/money';
import { createBudgetSchema, updateBudgetSchema } from '../validators/budget';
import { actorFrom, auditService } from '../services/auditService';

async function assertExpenseCategory(req: Request, categoryId: string) {
  const category = await Category.findOne({ _id: categoryId, ...orgScope(req) });
  if (!category) throw new ValidationError('Category was not found');
  if (category.type !== 'expense') throw new ValidationError('Budgets can only track expense categories');
}

export const budgetController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createBudgetSchema, req.body);
      await assertExpenseCategory(req, input.categoryId);

      const budget = await Budget.create({
        ...input,
        ...orgScope(req),
        createdBy: req.user!.userId,
        ...budgetService.currentPeriod(input.period),
      });

      sendSuccess(res, 201, budget);
      budgetService.checkAndNotify(req.user!.organizationId!);
      auditService.record(actorFrom(req), {
        action: 'budget.created',
        entityType: 'budget',
        entityId: budget._id,
        summary: `Set a ${budget.period} budget of ${formatMinor(budget.amount)}`,
        after: budget,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, 200, await budgetService.getAllWithStatus(req.user!.organizationId!));
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const budget = await budgetService.getById(req.params.id as string, req.user!.organizationId!);
      if (!budget) throw new NotFoundError('Budget');
      sendSuccess(res, 200, { ...budget.toJSON(), ...(await budgetService.status(budget)) });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateBudgetSchema, req.body);
      if (changes.categoryId) await assertExpenseCategory(req, changes.categoryId);

      const budget = await Budget.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!budget) throw new NotFoundError('Budget');
      const before = budget.toJSON();
      budget.set({ ...changes, ...(changes.period ? budgetService.currentPeriod(changes.period) : {}) });
      await budget.save();
      await budget.populate('categoryId');

      sendSuccess(res, 200, budget);
      budgetService.checkAndNotify(req.user!.organizationId!);
      auditService.record(actorFrom(req), {
        action: 'budget.updated',
        entityType: 'budget',
        entityId: budget._id,
        summary: `Edited the ${(budget.categoryId as any)?.name ?? ''} budget (${budget.period}, ${formatMinor(budget.amount)})`,
        before,
        after: budget,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await Budget.findOneAndDelete({ _id: req.params.id, ...orgScope(req) });
      if (!deleted) throw new NotFoundError('Budget');
      sendSuccess(res, 200, { message: 'Budget deleted' });
      auditService.record(actorFrom(req), {
        action: 'budget.deleted',
        entityType: 'budget',
        entityId: deleted._id,
        summary: `Deleted a ${deleted.period} budget of ${formatMinor(deleted.amount)}`,
        before: deleted,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, 200, await budgetService.getAlerts(req.user!.organizationId!));
    } catch (error) {
      next(error);
    }
  },
};
