import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { Transaction } from '../models/Transaction';
import { Expense } from '../models/Expense';
import { Budget } from '../models/Budget';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { sendSuccess } from '../utils/response';
import { ConflictError, NotFoundError } from '../utils/errors';
import { orgScope } from '../middleware/auth';
import { parse } from '../utils/validate';
import { createCategorySchema, updateCategorySchema } from '../validators/category';
import { actorFrom, auditService } from '../services/auditService';

/** True when any record points at the category. */
const isInUse = async (categoryId: unknown) =>
  !!(
    (await Transaction.exists({ categoryId })) ||
    (await Expense.exists({ categoryId })) ||
    (await Budget.exists({ categoryId })) ||
    (await RecurringTransaction.exists({ categoryId }))
  );

export const categoryController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.find(orgScope(req)).sort({ type: 1, name: 1 });
      sendSuccess(res, 200, categories);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createCategorySchema, req.body);
      const category = await Category.create({ ...input, ...orgScope(req), createdBy: req.user!.userId });
      sendSuccess(res, 201, category);
      auditService.record(actorFrom(req), {
        action: 'category.created',
        entityType: 'category',
        entityId: category._id,
        summary: `Added ${category.type} category ${category.name}`,
        after: category,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateCategorySchema, req.body);
      const category = await Category.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!category) throw new NotFoundError('Category');

      if (changes.type && changes.type !== category.type && (await isInUse(category._id))) {
        throw new ConflictError(`${category.name} is already used, so it can't switch between income and expense`);
      }

      const before = category.toJSON();
      category.set(changes);
      await category.save();
      sendSuccess(res, 200, category);
      auditService.record(actorFrom(req), {
        action: 'category.updated',
        entityType: 'category',
        entityId: category._id,
        summary: `Edited category ${category.name}`,
        before,
        after: category,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!category) throw new NotFoundError('Category');

      if (await isInUse(category._id)) {
        throw new ConflictError(
          `${category.name} is used by transactions, expenses, budgets or recurring entries, so it can't be deleted`
        );
      }

      await Category.deleteOne({ _id: category._id });
      sendSuccess(res, 200, { message: 'Category deleted' });
      auditService.record(actorFrom(req), {
        action: 'category.deleted',
        entityType: 'category',
        entityId: category._id,
        summary: `Deleted category ${category.name}`,
        before: category,
      });
    } catch (error) {
      next(error);
    }
  },
};
