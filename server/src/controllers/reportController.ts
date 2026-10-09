import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';
import { sendSuccess } from '../utils/response';
import { AuthorizationError, ValidationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';

const parsePeriod = (body: any) => {
  const startDate = new Date(body?.startDate);
  const endDate = new Date(body?.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ValidationError('A valid start and end date are required');
  }
  if (startDate > endDate) {
    throw new ValidationError('Start date must be before end date');
  }
  return { startDate, endDate };
};

export const reportController = {
  async generateIncomeStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parsePeriod(req.body);
      const data = await reportService.generateIncomeStatement(req.user?.userId, startDate, endDate);
      await reportService.saveReport(req.user?.userId, 'income', data, { startDate, endDate });
      sendSuccess(res, 200, data);
    } catch (error) {
      next(error);
    }
  },

  async generateCashFlowStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parsePeriod(req.body);
      const data = await reportService.generateCashFlowStatement(req.user?.userId, startDate, endDate);
      await reportService.saveReport(req.user?.userId, 'cash_flow', data, { startDate, endDate });
      sendSuccess(res, 200, data);
    } catch (error) {
      next(error);
    }
  },

  async generateBalanceSheet(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.generateBalanceSheet(req.user?.userId);
      await reportService.saveReport(req.user?.userId, 'balance', data);
      sendSuccess(res, 200, data);
    } catch (error) {
      next(error);
    }
  },

  async generateTaxSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parsePeriod(req.body);
      const data = await reportService.generateTaxSummary(req.user?.userId, startDate, endDate);
      await reportService.saveReport(req.user?.userId, 'tax', data, { startDate, endDate });
      sendSuccess(res, 200, data);
    } catch (error) {
      next(error);
    }
  },

  async generateComprehensiveReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parsePeriod(req.body);
      const data = await reportService.generateComprehensiveReport(req.user?.userId, startDate, endDate);
      await reportService.saveReport(req.user?.userId, 'summary', data, { startDate, endDate });
      sendSuccess(res, 200, data);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const reports = await reportService.getReportsByUser(req.user?.userId, limit, skip);
      sendSuccess(res, 200, reports);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const report = await reportService.getReportById(reportId, req.user?.userId);

      if (!report) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `report:${reportId}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to view this report');
      }

      sendSuccess(res, 200, report);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const deleted = await reportService.deleteReport(reportId, req.user?.userId);

      if (!deleted) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `report:${reportId}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this report');
      }

      sendSuccess(res, 200, { message: 'Report deleted' });
    } catch (error) {
      next(error);
    }
  },
};
