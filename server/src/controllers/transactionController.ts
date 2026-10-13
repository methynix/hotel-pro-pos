import { Request, Response, NextFunction } from 'express';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendPaginated } from '../utils/response';
import { orgScope } from '../middleware/auth';
import { ledgerService, LedgerInput } from '../services/ledgerService';
import { budgetService } from '../services/budgetService';
import { parse } from '../utils/validate';
import { createTransactionSchema, updateTransactionSchema } from '../validators/transaction';

export const transactionController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 500);
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find(orgScope(req)).sort({ transactionDate: -1, createdAt: -1 }).skip(skip).limit(limit),
        Transaction.countDocuments(orgScope(req)),
      ]);

      sendPaginated(res, 200, transactions, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createTransactionSchema, req.body);
      const transaction = await ledgerService.create(req.user!.organizationId!, req.user!.userId, input as LedgerInput);
      sendSuccess(res, 201, transaction);
      if (transaction.type === 'expense') budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateTransactionSchema, req.body);
      const updated = await ledgerService.update(req.user!.organizationId!, req.params.id as string, changes);
      sendSuccess(res, 200, updated);
      budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const removed = await ledgerService.remove(req.user!.organizationId!, req.params.id as string);
      sendSuccess(res, 200, { message: 'Transaction deleted' });
      if (removed.type === 'expense') budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },
};
