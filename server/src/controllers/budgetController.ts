import { Request, Response, NextFunction } from 'express';
import { budgetService } from '../services/budgetService';
import { sendSuccess } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';

export const budgetController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      let startDate = new Date(now);
      let endDate = new Date(now);

      const period = req.body.period || 'monthly';

      switch (period) {
        case 'monthly':
          startDate.setDate(1);
          endDate.setMonth(endDate.getMonth() + 1, 0);
          break;
        case 'quarterly':
          startDate.setMonth(Math.floor(startDate.getMonth() / 3) * 3, 1);
          endDate.setMonth(startDate.getMonth() + 3, 0);
          break;
        case 'yearly':
          startDate.setMonth(0, 1);
          endDate.setMonth(11, 31);
          break;
      }

      const budget = await budgetService.createBudget({
        ...req.body,
        userId: req.user?.userId,
        startDate,
        endDate,
      });

      sendSuccess(res, 201, budget);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const budgets = await budgetService.getAllBudgetStatus(req.user?.userId);
      sendSuccess(res, 200, budgets);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const budget = await budgetService.getBudgetById(id, req.user?.userId);

      if (!budget) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `budget:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to view this budget');
      }

      const status = await budgetService.calculateBudgetStatus(id, req.user?.userId);
      sendSuccess(res, 200, { ...budget.toObject(), ...status });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const budget = await budgetService.updateBudget(id, req.user?.userId, req.body);

      if (!budget) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `budget:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to update this budget');
      }

      sendSuccess(res, 200, budget);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await budgetService.deleteBudget(id, req.user?.userId);

      if (!deleted) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `budget:${id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this budget');
      }

      sendSuccess(res, 200, { message: 'Budget deleted' });
    } catch (error) {
      next(error);
    }
  },

  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await budgetService.getAlertsForUser(req.user?.userId);
      sendSuccess(res, 200, alerts);
    } catch (error) {
      next(error);
    }
  },
};
