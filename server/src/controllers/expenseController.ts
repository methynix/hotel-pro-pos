import { Request, Response, NextFunction } from 'express';
import { Expense } from '../models/Expense';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';
import { CAN_APPROVE, hasRole } from '../config/permissions';

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
      const body = { ...req.body };
      // Only approvers may file an expense as already approved/rejected.
      if (!hasRole(req.user?.role, CAN_APPROVE)) body.status = 'pending';

      const expense = await Expense.create({
        ...body,
        userId: req.user?.userId,
      });
      sendSuccess(res, 201, expense);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!expense) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `expense:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to update this expense');
      }

      const body = { ...req.body };
      delete body.userId;
      if (!hasRole(req.user?.role, CAN_APPROVE)) delete body.status;

      const updated = await Expense.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
      sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!expense) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `expense:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this expense');
      }

      await Expense.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Expense deleted' });
    } catch (error) {
      next(error);
    }
  },
};
