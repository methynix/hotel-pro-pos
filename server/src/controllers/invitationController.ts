import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Invitation, IInvitation } from '../models/Invitation';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { organizationService } from '../services/organizationService';
import { emailService, renderEmail } from '../services/emailService';
import { notificationService } from '../services/notificationService';
import { startSession } from './authController';
import { ROLE_LABELS } from './userController';
import { sendSuccess } from '../utils/response';
import { AuthorizationError, ConflictError, NotFoundError } from '../utils/errors';
import { parse } from '../utils/validate';
import { acceptInvitationSchema, createInvitationSchema } from '../validators/organization';
import env from '../config/env';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const invitePath = (token: string) => `/invite/${token}`;

/** Finds a pending, unexpired invitation by its raw token. */
async function findPending(token: string): Promise<IInvitation> {
  const invitation = await Invitation.findOne({
    tokenHash: hashToken(String(token)),
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!invitation) throw new NotFoundError('Invitation (it may have expired or already been used)');
  return invitation;
}

export const invitationController = {
  /** Admin: invites someone by email. Returns the link too, so it can be shared without email. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId!;
      const { email, role } = parse(createInvitationSchema, req.body);

      if (await User.exists({ email, 'organizations.organizationId': organizationId })) {
        throw new ConflictError(`${email} is already a member of this organization`);
      }

      // Re-inviting replaces any earlier pending invite for the same email.
      await Invitation.deleteMany({ organizationId, email, acceptedAt: { $exists: false } });

      const token = crypto.randomBytes(32).toString('base64url');
      const invitation = await Invitation.create({
        organizationId,
        email,
        role,
        tokenHash: hashToken(token),
        invitedBy: req.user!.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });

      const [org, inviter] = await Promise.all([
        Organization.findById(organizationId).select('name'),
        User.findById(req.user!.userId).select('name'),
      ]);
      const inviteUrl = `${env.CLIENT_URL.replace(/\/$/, '')}${invitePath(token)}`;

      const emailed = await emailService.send(
        email,
        `${inviter?.name ?? 'Someone'} invited you to ${org?.name ?? 'ledgerHQ'}`,
        renderEmail({
          heading: `Join ${org?.name ?? 'your team'} on ledgerHQ`,
          paragraphs: [
            `${inviter?.name ?? 'An administrator'} invited you to join ${org?.name ?? 'their organization'} on ledgerHQ.`,
            'The link below works for 7 days.',
          ],
          rows: [
            { label: 'Organization', value: org?.name ?? '' },
            { label: 'Role', value: ROLE_LABELS[role] || role },
          ],
          action: { label: 'Accept invitation', path: invitePath(token) },
        })
      );

      sendSuccess(res, 201, { invitation, inviteUrl, emailed });
    } catch (error) {
      next(error);
    }
  },

  /** Admin: pending invitations for this organization. */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const invitations = await Invitation.find({
        organizationId: req.user!.organizationId,
        acceptedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
        .select('-tokenHash')
        .sort({ createdAt: -1 });
      sendSuccess(res, 200, invitations);
    } catch (error) {
      next(error);
    }
  },

  /** Admin: revokes a pending invitation. */
  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await Invitation.deleteOne({
        _id: req.params.id,
        organizationId: req.user!.organizationId,
        acceptedAt: { $exists: false },
      });
      if (!result.deletedCount) throw new NotFoundError('Invitation');
      sendSuccess(res, 200, { message: 'Invitation revoked' });
    } catch (error) {
      next(error);
    }
  },

  /** Public: what an invite link is for, so the accept page can explain it. */
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await findPending(req.params.token as string);
      const [org, inviter, existingUser] = await Promise.all([
        Organization.findById(invitation.organizationId).select('name'),
        User.findById(invitation.invitedBy).select('name'),
        User.exists({ email: invitation.email }),
      ]);
      sendSuccess(res, 200, {
        email: invitation.email,
        role: invitation.role,
        organizationName: org?.name ?? '',
        invitedBy: inviter?.name ?? '',
        expiresAt: invitation.expiresAt,
        existingUser: !!existingUser,
      });
    } catch (error) {
      next(error);
    }
  },

  /** Public: creates an account for a new user from an invite and signs them in. */
  async acceptAsNewUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, password } = parse(acceptInvitationSchema, req.body);
      const invitation = await findPending(req.params.token as string);

      if (await User.exists({ email: invitation.email })) {
        throw new ConflictError('An account with this email already exists. Sign in to accept the invitation.');
      }

      const user = await mongoose.connection.transaction(async (session) => {
        const [created] = await User.create([{ email: invitation.email, password, name }], { session });
        organizationService.addMember(created, invitation.organizationId, invitation.role);
        await created.save({ session });
        invitation.acceptedAt = new Date();
        await invitation.save({ session });
        return created;
      });

      await startSession(res, user, 201);
      notifyJoined(invitation, user.name, user.email);
    } catch (error) {
      next(error);
    }
  },

  /** Signed in: adds the current user to the inviting organization. */
  async acceptAsExistingUser(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await findPending(req.params.token as string);
      const user = await User.findById(req.user?.userId);
      if (!user) throw new NotFoundError('User');

      // The invite was addressed to one person; a forwarded link can't be
      // used to join under a different account.
      if (user.email !== invitation.email) {
        throw new AuthorizationError(`This invitation is for ${invitation.email}. Sign in with that email to accept it.`);
      }

      await mongoose.connection.transaction(async (session) => {
        organizationService.addMember(user, invitation.organizationId, invitation.role);
        await user.save({ session });
        invitation.acceptedAt = new Date();
        await invitation.save({ session });
      });

      sendSuccess(res, 200, await organizationService.toPublicUser(user));
      notifyJoined(invitation, user.name, user.email);
    } catch (error) {
      next(error);
    }
  },
};

/** Tells the organization's admins that someone accepted an invitation. */
function notifyJoined(invitation: IInvitation, name: string, email: string): void {
  organizationService
    .membersWithRoles(invitation.organizationId.toString(), ['admin'])
    .then((admins) =>
      Promise.all(
        admins
          .filter((a) => a.email !== email)
          .map((admin) =>
            notificationService.notify(admin, {
              category: 'account',
              title: `${name} joined your organization`,
              message: `${name} (${email}) accepted your invitation and joined as ${invitation.role}.`,
              link: '/app/users',
            })
          )
      )
    )
    .catch((e) => console.error('Join notification failed:', e instanceof Error ? e.message : e));
}
