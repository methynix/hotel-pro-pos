import mongoose, { Schema, Document } from 'mongoose';

// An append-only record of who changed what. There is no API to edit or
// delete entries; the app only ever inserts them, inside the same database
// transaction as the change where there is one.
export interface IAuditLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  /** Null for changes the system made on its own, e.g. a scheduled recurring transaction. */
  userId: mongoose.Types.ObjectId | null;
  /** Snapshot of the actor at the time, so the log still reads correctly after they leave. */
  userName: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, required: true },
    userEmail: String,
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    summary: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
