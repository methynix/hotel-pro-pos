import { Request, Response, NextFunction } from 'express';
import { Expense } from '../models/Expense';
import { sendSuccess, sendPaginated } from '../utils/response';

export const expenseController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        Expense.find({ userId: req.user?.userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Expense.countDocuments({ userId: req.user?.userId }),
      ]);

      sendPaginated(res, 200, expenses, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.create({
        ...req.body,
        userId: req.user?.userId,
      });
      sendSuccess(res, 201, expense);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
      sendSuccess(res, 200, expense);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await Expense.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  },
};
