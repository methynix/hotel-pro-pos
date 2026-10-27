import { Request, Response, NextFunction } from 'express';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendPaginated } from '../utils/response';
import { orgScope } from '../middleware/auth';
import { ledgerService, LedgerInput } from '../services/ledgerService';
import { budgetService } from '../services/budgetService';
import { parse } from '../utils/validate';
import { createTransactionSchema, updateTransactionSchema, voidTransactionSchema } from '../validators/transaction';
import { actorFrom } from '../services/auditService';

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
      const transaction = await ledgerService.create(actorFrom(req), input as LedgerInput);
      sendSuccess(res, 201, transaction);
      if (transaction.type === 'expense') budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateTransactionSchema, req.body);
      const updated = await ledgerService.update(actorFrom(req), req.params.id as string, changes);
      sendSuccess(res, 200, updated);
      budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },

  /** Ledger entries are never deleted; voiding reverses them and keeps the record. */
  async void(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = parse(voidTransactionSchema, req.body);
      const voided = await ledgerService.void(actorFrom(req), req.params.id as string, reason);
      sendSuccess(res, 200, voided);
      if (voided.type === 'expense') budgetService.checkAndNotify(req.user!.organizationId!);
    } catch (error) {
      next(error);
    }
  },
};
