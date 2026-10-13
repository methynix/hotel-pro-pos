import { Request, Response, NextFunction } from 'express';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Account } from '../models/Account';
import { Category } from '../models/Category';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { orgScope } from '../middleware/auth';
import { parse } from '../utils/validate';
import { createRecurringSchema, updateRecurringSchema } from '../validators/recurring';

/** Checks the account and category belong to the organization and match the type. */
async function assertReferences(req: Request, input: { type: string; accountId: string; categoryId: string }) {
  const [account, category] = await Promise.all([
    Account.findOne({ _id: input.accountId, ...orgScope(req) }),
    Category.findOne({ _id: input.categoryId, ...orgScope(req) }),
  ]);
  if (!account) throw new ValidationError('Account was not found');
  if (!category) throw new ValidationError('Category was not found');
  if (category.type !== input.type) {
    throw new ValidationError(`${category.name} is an ${category.type} category; pick an ${input.type} category`);
  }
}

export const recurringTransactionController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createRecurringSchema, req.body);
      await assertReferences(req, input);
      const recurring = await RecurringTransaction.create({ ...input, ...orgScope(req), createdBy: req.user!.userId });
      sendSuccess(res, 201, recurring);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const recurring = await RecurringTransaction.find(orgScope(req)).sort({ isActive: -1, nextDate: 1 });
      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const recurring = await RecurringTransaction.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!recurring) throw new NotFoundError('Recurring transaction');
      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateRecurringSchema, req.body);
      const recurring = await RecurringTransaction.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!recurring) throw new NotFoundError('Recurring transaction');

      recurring.set(changes);
      await assertReferences(req, {
        type: recurring.type,
        accountId: recurring.accountId.toString(),
        categoryId: recurring.categoryId.toString(),
      });
      recurring.lastError = undefined;
      await recurring.save();
      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const recurring = await RecurringTransaction.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!recurring) throw new NotFoundError('Recurring transaction');
      recurring.isActive = !recurring.isActive;
      await recurring.save();
      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecurringTransaction.deleteOne({ _id: req.params.id, ...orgScope(req) });
      if (!result.deletedCount) throw new NotFoundError('Recurring transaction');
      sendSuccess(res, 200, { message: 'Recurring transaction deleted' });
    } catch (error) {
      next(error);
    }
  },
};
