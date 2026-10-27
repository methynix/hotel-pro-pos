import { Request } from 'express';
import { ClientSession } from 'mongoose';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';

export interface Actor {
  organizationId: string;
  /** Null when the system acts on its own (scheduled jobs). */
  userId: string | null;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: unknown;
  summary: string;
  before?: unknown;
  after?: unknown;
}

const SECRET_FIELDS = ['password', 'tokenHash', '__v'];

/** A plain, secret-free copy of a document (money already in major units via toJSON). */
export function snapshot(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  const plain = typeof (value as any).toJSON === 'function' ? (value as any).toJSON() : value;
  const copy = JSON.parse(JSON.stringify(plain));
  for (const field of SECRET_FIELDS) delete copy[field];
  return copy;
}

export const actorFrom = (req: Request): Actor => ({
  organizationId: req.user!.organizationId!,
  userId: req.user!.userId,
});

export const SYSTEM_ACTOR = (organizationId: string): Actor => ({ organizationId, userId: null });

export const auditService = {
  /**
   * Appends an audit entry. Inside a session it is part of the same database
   * transaction, so a change and its log entry commit or fail together;
   * without one, a logging failure is reported but never breaks the request.
   */
  async record(actor: Actor, entry: AuditEntry, session?: ClientSession): Promise<void> {
    const write = async () => {
      const user = actor.userId ? await User.findById(actor.userId).select('name email').lean() : null;
      await AuditLog.create(
        [
          {
            organizationId: actor.organizationId,
            userId: actor.userId,
            userName: user?.name ?? (actor.userId ? 'Unknown user' : 'System'),
            userEmail: user?.email,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            summary: entry.summary,
            before: snapshot(entry.before),
            after: snapshot(entry.after),
          },
        ],
        session ? { session } : {}
      );
    };

    if (session) return write();
    try {
      await write();
    } catch (error) {
      console.error('Audit log write failed:', error instanceof Error ? error.message : error);
    }
  },
};
