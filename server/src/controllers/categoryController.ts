import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { sendSuccess } from '../utils/response';
import { AuthorizationError } from '../utils/errors';
import { securityLogger } from '../services/securityLogger';

export const categoryController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.find({ userId: req.user?.userId });
      sendSuccess(res, 200, categories);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.create({
        ...req.body,
        userId: req.user?.userId,
      });
      sendSuccess(res, 201, category);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!category) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `category:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to update this category');
      }

      const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
      sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.findOne({ _id: req.params.id, userId: req.user?.userId });

      if (!category) {
        securityLogger.logPermissionDenied(req.user?.userId || 'unknown', `category:${req.params.id}`, req.ip || 'unknown');
        throw new AuthorizationError('Not authorized to delete this category');
      }

      await Category.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Category deleted' });
    } catch (error) {
      next(error);
    }
  },
};
