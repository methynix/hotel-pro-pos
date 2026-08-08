import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AuthorizationError } from '../utils/errors';

export const userController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find().select('-password').skip(skip).limit(limit),
        User.countDocuments(),
      ]);

      sendPaginated(res, 200, users, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
      sendSuccess(res, 200, user);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await User.findByIdAndDelete(req.params.id);
      sendSuccess(res, 200, { message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  },
};
