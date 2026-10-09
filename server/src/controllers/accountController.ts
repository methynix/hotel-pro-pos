import { Request, Response, NextFunction } from 'express';
import { Account } from '../models/Account';
import { sendSuccess } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';

export const accountController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const accounts = await Account.find({ userId: req.user?.userId });
      sendSuccess(res, 200, accounts);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await Account.create({
        ...req.body,
        userId: req.user?.userId,
      });
      sendSuccess(res, 201, account);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await Account.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!account) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `account:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to update this account');
      }

      const { userId: _userId, ...changes } = req.body;
      const updated = await Account.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
      sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await Account.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!account) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `account:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this account');
      }

      await Account.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  },
};
