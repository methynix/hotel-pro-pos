import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export const notificationController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const [items, unread] = await Promise.all([
        Notification.find({ userId: req.user?.userId }).sort({ createdAt: -1 }).limit(limit),
        Notification.countDocuments({ userId: req.user?.userId, read: false }),
      ]);
      sendSuccess(res, 200, { items, unread });
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user?.userId },
        { read: true },
        { new: true }
      );
      if (!notification) throw new NotFoundError('Notification');
      sendSuccess(res, 200, notification);
    } catch (error) {
      next(error);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await Notification.updateMany({ userId: req.user?.userId, read: false }, { read: true });
      sendSuccess(res, 200, { message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },
};
