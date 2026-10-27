import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { organizationService } from '../services/organizationService';
import { sendSuccess } from '../utils/response';
import { AuthenticationError, NotFoundError } from '../utils/errors';
import { parse } from '../utils/validate';
import { createOrganizationSchema, updateOrganizationSchema } from '../validators/organization';
import { actorFrom, auditService } from '../services/auditService';

export const organizationController = {
  /** Any signed-in user can found another organization and becomes its admin. */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = parse(createOrganizationSchema, req.body);
      const user = await mongoose.connection.transaction(async (session) => {
        const found = await User.findById(req.user?.userId).session(session);
        if (!found) throw new AuthenticationError('User not found');
        await organizationService.createForUser(name, found, session);
        return found;
      });
      sendSuccess(res, 201, await organizationService.toPublicUser(user));
    } catch (error) {
      next(error);
    }
  },

  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await Organization.findById(req.user?.organizationId);
      if (!organization) throw new NotFoundError('Organization');
      sendSuccess(res, 200, organization);
    } catch (error) {
      next(error);
    }
  },

  async updateCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateOrganizationSchema, req.body);
      const before = await Organization.findById(req.user?.organizationId);
      const organization = await Organization.findByIdAndUpdate(req.user?.organizationId, changes, {
        new: true,
        runValidators: true,
      });
      if (!organization) throw new NotFoundError('Organization');
      sendSuccess(res, 200, organization);
      auditService.record(actorFrom(req), {
        action: 'organization.updated',
        entityType: 'organization',
        entityId: organization._id,
        summary: before?.name !== organization.name ? `Renamed the business from ${before?.name} to ${organization.name}` : 'Updated business settings',
        before,
        after: organization,
      });
    } catch (error) {
      next(error);
    }
  },
};
