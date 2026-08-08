import { Request, Response, NextFunction } from 'express';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

export const transactionController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find({ userId: req.user?.userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Transaction.countDocuments({ userId: req.user?.userId }),
      ]);

      sendPaginated(res, 200, transactions, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await Transaction.create({
        ...req.body,
        userId: req.user?.userId,
      });
      sendSuccess(res, 201, transaction);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
      sendSuccess(res, 200, transaction);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await Transaction.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  },
};
