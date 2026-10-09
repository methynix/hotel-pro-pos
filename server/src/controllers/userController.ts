import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { sendSuccess, sendPaginated } from '../utils/response';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { createUserSchema, updateUserSchema } from '../validators/user';

const parse = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message || 'Invalid input');
  }
  return result.data;
};

export const userController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(),
      ]);

      sendPaginated(res, 200, users, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createUserSchema, req.body);
      const email = input.email.toLowerCase();

      if (await User.exists({ email })) {
        throw new ConflictError('A user with this email already exists');
      }

      const user = await User.create({ ...input, email });
      const { password: _password, ...safeUser } = user.toObject();
      sendSuccess(res, 201, safeUser);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(updateUserSchema, req.body);
      const isSelf = req.params.id === req.user?.userId;

      if (isSelf && input.role && input.role !== 'admin') {
        throw new ValidationError('You cannot remove your own admin role');
      }
      if (isSelf && input.isActive === false) {
        throw new ValidationError('You cannot deactivate your own account');
      }

      const user = await User.findById(req.params.id).select('+password');
      if (!user) throw new NotFoundError('User');

      if (input.email) {
        const email = input.email.toLowerCase();
        if (email !== user.email && (await User.exists({ email }))) {
          throw new ConflictError('A user with this email already exists');
        }
        user.email = email;
      }
      if (input.name !== undefined) user.name = input.name;
      if (input.role !== undefined) user.role = input.role;
      if (input.isActive !== undefined) user.isActive = input.isActive;
      if (input.password) user.password = input.password;

      // save() rather than findByIdAndUpdate so the password hook runs.
      await user.save();
      const { password: _password, ...safeUser } = user.toObject();
      sendSuccess(res, 200, safeUser);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.params.id === req.user?.userId) {
        throw new ValidationError('You cannot delete your own account');
      }

      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) throw new NotFoundError('User');

      sendSuccess(res, 200, { message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  },
};
