import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { sendSuccess } from '../utils/response';

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
      const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
      sendSuccess(res, 200, category);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await Category.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  },
};
