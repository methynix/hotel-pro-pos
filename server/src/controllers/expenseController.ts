import { Request, Response, NextFunction } from 'express';
import { Expense } from '../models/Expense';
import { Category } from '../models/Category';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { orgScope } from '../middleware/auth';
import { CAN_APPROVE, hasRole } from '../config/permissions';
import { parse } from '../utils/validate';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense';

async function assertExpenseCategory(req: Request, categoryId: string) {
  const category = await Category.findOne({ _id: categoryId, ...orgScope(req) });
  if (!category) throw new ValidationError('Category was not found');
  if (category.type !== 'expense') throw new ValidationError(`${category.name} is not an expense category`);
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
      // Only approvers may file an expense as already approved/rejected.
      if (!hasRole(req.user?.role, CAN_APPROVE)) input.status = 'pending';
      await assertExpenseCategory(req, input.categoryId);

      const expense = await Expense.create({ ...input, ...orgScope(req), createdBy: req.user!.userId });
      sendSuccess(res, 201, expense);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateExpenseSchema, req.body);
      if (!hasRole(req.user?.role, CAN_APPROVE)) delete changes.status;
      if (changes.categoryId) await assertExpenseCategory(req, changes.categoryId);

      const updated = await Expense.findOneAndUpdate({ _id: req.params.id, ...orgScope(req) }, changes, {
        new: true,
        runValidators: true,
      });
      if (!updated) throw new NotFoundError('Expense');
      sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await Expense.findOneAndDelete({ _id: req.params.id, ...orgScope(req) });
      if (!deleted) throw new NotFoundError('Expense');
      sendSuccess(res, 200, { message: 'Expense deleted' });
    } catch (error) {
      next(error);
    }
  },
};
