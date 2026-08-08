import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { sendSuccess } from '../utils/response';

export const analyticsController = {
  async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const timeframe = (req.query.timeframe as 'month' | 'quarter' | 'year') || 'month';
      const metrics = await analyticsService.getDashboardMetrics(req.user?.userId, timeframe);
      sendSuccess(res, 200, metrics);
    } catch (error) {
      next(error);
    }
  },

  async getTopCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const categories = await analyticsService.getTopCategories(req.user?.userId, limit);
      sendSuccess(res, 200, categories);
    } catch (error) {
      next(error);
    }
  },

  async getCashFlowTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trend = await analyticsService.getCashFlowTrend(req.user?.userId, days);
      sendSuccess(res, 200, trend);
    } catch (error) {
      next(error);
    }
  },

  async getMonthlyComparison(req: Request, res: Response, next: NextFunction) {
    try {
      const comparison = await analyticsService.getMonthlyComparison(req.user?.userId);
      sendSuccess(res, 200, comparison);
    } catch (error) {
      next(error);
    }
  },

  async getFullDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      const timeframe = (req.query.timeframe as 'month' | 'quarter' | 'year') || 'month';
      const limit = parseInt(req.query.limit as string) || 5;

      const [metrics, topCategories, cashFlowTrend, monthlyComparison] = await Promise.all([
        analyticsService.getDashboardMetrics(req.user?.userId, timeframe),
        analyticsService.getTopCategories(req.user?.userId, limit),
        analyticsService.getCashFlowTrend(req.user?.userId, 30),
        analyticsService.getMonthlyComparison(req.user?.userId),
      ]);

      sendSuccess(res, 200, {
        metrics,
        topCategories,
        cashFlowTrend,
        monthlyComparison,
      });
    } catch (error) {
      next(error);
    }
  },
};
