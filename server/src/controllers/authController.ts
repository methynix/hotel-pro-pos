import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { authService } from '../services/authService';
import { securityLogger } from '../services/securityLogger';
import { organizationService } from '../services/organizationService';
import { AuthenticationError, ValidationError, ConflictError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { parse } from '../utils/validate';
import env from '../config/env';
import { registerSchema, updateProfileSchema, changePasswordSchema } from '../validators/auth';
import { switchOrganizationSchema } from '../validators/organization';
import { notificationService } from '../services/notificationService';
import { emailService, renderEmail } from '../services/emailService';

/** Issues tokens for `user` and responds with the access token and public user. */
export async function startSession(res: Response, user: IUser, status = 200): Promise<void> {
  const { accessToken, refreshToken } = authService.generateTokens({
    userId: user._id.toString(),
    email: user.email,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.HTTPS_ONLY,
    sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  sendSuccess(res, status, {
    accessToken,
    user: await organizationService.toPublicUser(user),
  });
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || 'unknown';

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user and select password
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        securityLogger.logFailedLogin(email, ipAddress, req.get('user-agent'));
        return authService.getGenericAuthError();
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        securityLogger.logFailedLogin(email, ipAddress, req.get('user-agent'));
        return authService.getGenericAuthError();
      }

      if (!user.isActive) {
        securityLogger.logFailedLogin(email, ipAddress, req.get('user-agent'));
        throw new AuthenticationError('This account has been deactivated. Contact an administrator.');
      }

      await startSession(res, user);
    } catch (error) {
      next(error);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, organizationName } = parse(registerSchema, req.body);

      if (await User.exists({ email })) {
        throw new ConflictError('Email already registered');
      }

      // The founder becomes the admin of a brand-new organization. Both are
      // created together so a failure can't leave an orphaned user or org.
      const user = await mongoose.connection.transaction(async (session) => {
        const [created] = await User.create([{ email, password, name }], { session });
        await organizationService.createForUser(organizationName, created, session);
        return created;
      });

      await startSession(res, user, 201);

      notificationService.notify(user, {
        category: 'account',
        title: 'Welcome to ledgerHQ',
        message: `${organizationName} is ready. Add your accounts, then invite your team from the Users page.`,
        link: '/app/accounts',
        email: { actionLabel: 'Open ledgerHQ' },
      });
    } catch (error) {
      next(error);
    }
  },

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      sendSuccess(res, 200, await organizationService.toPublicUser(user));
    } catch (error) {
      next(error);
    }
  },

  /** Makes another of the user's organizations the active one. */
  async switchOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = parse(switchOrganizationSchema, req.body);
      const user = await User.findById(req.user?.userId);
      if (!user) throw new AuthenticationError('User not found');

      if (!user.organizations.some((m) => m.organizationId.toString() === organizationId)) {
        throw new NotFoundError('Organization');
      }
      user.activeOrganizationId = new mongoose.Types.ObjectId(organizationId);
      await user.save();
      sendSuccess(res, 200, await organizationService.toPublicUser(user));
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { name, email, preferences } = parsed.data;

      const user = await User.findById(req.user?.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      const previousEmail = user.email;
      if (email && email.toLowerCase() !== user.email) {
        if (await User.exists({ email: email.toLowerCase() })) {
          throw new ConflictError('Email already registered');
        }
        user.email = email.toLowerCase();
      }
      if (name) user.name = name;
      if (preferences) {
        user.set('preferences', { ...user.toObject().preferences, ...preferences });
      }

      await user.save();
      sendSuccess(res, 200, await organizationService.toPublicUser(user));

      if (user.email !== previousEmail) {
        const message = `The email address on your ledgerHQ account was changed from ${previousEmail} to ${user.email}. If you did not do this, contact info@methynix.com immediately.`;
        notificationService.notify(user, {
          category: 'security',
          title: 'Your email address was changed',
          message,
          link: '/app/settings',
        });
        // Also warn the old address, in case the account was taken over.
        emailService.send(
          previousEmail,
          'Your ledgerHQ email address was changed',
          renderEmail({ heading: 'Your email address was changed', paragraphs: [message] })
        );
      }
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { currentPassword, newPassword } = parsed.data;

      const user = await User.findById(req.user?.userId).select('+password');
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      if (!(await user.comparePassword(currentPassword))) {
        throw new ValidationError('Current password is incorrect');
      }
      if (currentPassword === newPassword) {
        throw new ValidationError('New password must be different from the current one');
      }

      user.password = newPassword;
      await user.save();
      sendSuccess(res, 200, { message: 'Password updated' });

      notificationService.notify(user, {
        category: 'security',
        title: 'Your password was changed',
        message: `Your ledgerHQ password was changed on ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })} (EAT). If this wasn't you, contact info@methynix.com immediately.`,
        link: '/app/settings',
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.HTTPS_ONLY,
        sameSite: env.HTTPS_ONLY ? 'none' : 'lax',
      });
      sendSuccess(res, 200, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },
};
