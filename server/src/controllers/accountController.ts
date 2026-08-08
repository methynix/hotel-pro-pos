import { Request, Response, NextFunction } from 'express';
import { Account } from '../models/Account';
import { sendSuccess, sendPaginated } from '../utils/response';

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
      const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
      sendSuccess(res, 200, account);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await Account.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  },
};
