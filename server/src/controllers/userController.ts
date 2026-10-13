import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { Organization } from '../models/Organization';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { parse } from '../utils/validate';
import { updateMemberSchema } from '../validators/organization';
import { notificationService } from '../services/notificationService';

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator (full access)',
  manager: 'Manager (create, edit and approve)',
  operator: 'Operator (create records)',
  viewer: 'Viewer (read-only)',
};

// These endpoints manage *memberships* of the caller's organization. A user
// account can belong to several organizations, so an admin here can change
// someone's role or remove them, but never edit or delete the account itself.

const membershipOf = (user: IUser, organizationId: string) =>
  user.organizations.find((m) => m.organizationId.toString() === organizationId);

const toMember = (user: IUser, organizationId: string) => {
  const membership = membershipOf(user, organizationId)!;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: membership.role,
    joinedAt: membership.joinedAt,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
};

async function findMember(organizationId: string, userId: string): Promise<IUser> {
  const user = await User.findOne({ _id: userId, 'organizations.organizationId': organizationId });
  if (!user) throw new NotFoundError('Member');
  return user;
}

export const userController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const filter = { 'organizations.organizationId': organizationId };

      const [users, total] = await Promise.all([
        User.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
        User.countDocuments(filter),
      ]);

      sendPaginated(res, 200, users.map((u) => toMember(u, organizationId)), { page, limit, total });
    } catch (error) {
      next(error);
    }
  },

  /** Changes a member's role in this organization. */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId!;
      const { role } = parse(updateMemberSchema, req.body);

      // The acting admin can't demote themselves, which also guarantees the
      // organization always keeps at least one admin.
      if (req.params.id === req.user?.userId) {
        throw new ValidationError('You cannot change your own role');
      }

      const user = await findMember(organizationId, req.params.id as string);
      const membership = membershipOf(user, organizationId)!;
      const previous = membership.role;
      membership.role = role;
      await user.save();
      sendSuccess(res, 200, toMember(user, organizationId));

      if (previous !== role) {
        const org = await Organization.findById(organizationId).select('name');
        notificationService.notify(user, {
          category: 'account',
          title: 'Your role has changed',
          message: `Your role in ${org?.name ?? 'your organization'} is now ${role} (previously ${previous}).`,
          link: '/app/settings',
          email: {
            paragraphs: [`An administrator changed your access level in ${org?.name ?? 'ledgerHQ'}.`],
            rows: [
              { label: 'Previous role', value: ROLE_LABELS[previous] || previous },
              { label: 'New role', value: ROLE_LABELS[role] || role },
            ],
            actionLabel: 'See what you can do',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /** Removes a member from this organization. Their account and other memberships remain. */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId!;
      if (req.params.id === req.user?.userId) {
        throw new ValidationError('You cannot remove yourself from the organization');
      }

      const user = await findMember(organizationId, req.params.id as string);
      user.organizations = user.organizations.filter((m) => m.organizationId.toString() !== organizationId);
      if (user.activeOrganizationId?.toString() === organizationId) {
        user.activeOrganizationId = user.organizations[0]?.organizationId ?? null;
      }
      await user.save();
      sendSuccess(res, 200, { message: 'Member removed' });

      const org = await Organization.findById(organizationId).select('name');
      notificationService.notify(user, {
        category: 'security',
        title: `You were removed from ${org?.name ?? 'an organization'}`,
        message: `An administrator removed you from ${org?.name ?? 'an organization'} in ledgerHQ, so you can no longer see its data.`,
      });
    } catch (error) {
      next(error);
    }
  },
};
