import { Request, Response, NextFunction } from 'express';
import { recurringTransactionService } from '../services/recurringTransactionService';
import { sendSuccess } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';

export const recurringTransactionController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const recurring = await recurringTransactionService.createRecurring({
        ...req.body,
        userId: req.user?.userId,
      });
      sendSuccess(res, 201, recurring);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const recurring = await recurringTransactionService.getRecurringByUser(req.user?.userId);
      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const recurring = await recurringTransactionService.getRecurringById(id, req.user?.userId);

      if (!recurring) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `recurring:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to view this recurring transaction');
      }

      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const recurring = await recurringTransactionService.updateRecurring(id, req.user?.userId, req.body);

      if (!recurring) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `recurring:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to update this recurring transaction');
      }

      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const recurring = await recurringTransactionService.toggleRecurring(id, req.user?.userId);

      if (!recurring) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `recurring:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to toggle this recurring transaction');
      }

      sendSuccess(res, 200, recurring);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await recurringTransactionService.deleteRecurring(id, req.user?.userId);

      if (!deleted) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `recurring:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this recurring transaction');
      }

      sendSuccess(res, 200, { message: 'Recurring transaction deleted' });
    } catch (error) {
      next(error);
    }
  },
};
