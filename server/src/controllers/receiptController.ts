import { Request, Response, NextFunction } from 'express';
import { Receipt } from '../models/Receipt';
import { receiptService } from '../services/receiptService';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';

export const receiptController = {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.body;
      if (!transactionId) {
        return sendSuccess(res, 400, { error: 'Transaction ID required' });
      }

      const receipt = await receiptService.generateReceipt(transactionId, req.user?.userId);
      sendSuccess(res, 201, receipt);
    } catch (error) {
      next(error);
    }
  },

  async getByTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const receipt = await Receipt.findOne({ transactionId, userId: req.user?.userId });

      if (!receipt) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `receipt:${transactionId}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to view this receipt');
      }

      sendSuccess(res, 200, receipt);
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [receipts, total] = await Promise.all([
        Receipt.find({ userId: req.user?.userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Receipt.countDocuments({ userId: req.user?.userId }),
      ]);

      sendPaginated(res, 200, receipts, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async printReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const receiptId = Array.isArray(req.params.receiptId) ? req.params.receiptId[0] : req.params.receiptId;
      const receipt = await Receipt.findOne({ _id: receiptId, userId: req.user?.userId });

      if (!receipt) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `receipt:print:${receiptId}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to print this receipt');
      }

      await receiptService.incrementPrintCount(receiptId);
      const html = await receiptService.formatReceiptHTML(receipt);

      res.type('html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!receipt) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `receipt:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this receipt');
      }

      await Receipt.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Receipt deleted' });
    } catch (error) {
      next(error);
    }
  },
};
