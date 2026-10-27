import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { sendPaginated } from '../utils/response';
import { orgScope } from '../middleware/auth';

// Read-only: the audit log has no create, update or delete endpoints.
export const auditController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const filter: Record<string, unknown> = { ...orgScope(req) };
      if (typeof req.query.entityType === 'string' && req.query.entityType) filter.entityType = req.query.entityType;
      if (typeof req.query.entityId === 'string' && /^[a-f\d]{24}$/i.test(req.query.entityId)) filter.entityId = req.query.entityId;
      if (typeof req.query.userId === 'string' && /^[a-f\d]{24}$/i.test(req.query.userId)) filter.userId = req.query.userId;

      const [entries, total] = await Promise.all([
        AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        AuditLog.countDocuments(filter),
      ]);
      sendPaginated(res, 200, entries, { page, limit, total });
    } catch (error) {
      next(error);
    }
  },
};
