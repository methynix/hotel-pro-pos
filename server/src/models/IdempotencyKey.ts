import mongoose, { Schema, Document } from 'mongoose';

// Remembers the outcome of a request sent with an Idempotency-Key header, so
// a retried or double-submitted request replays the first response instead of
// running twice. Keys expire after 24 hours.
export interface IIdempotencyKey extends Document {
  key: string;
  userId: mongoose.Types.ObjectId;
  method: string;
  path: string;
  requestHash: string;
  state: 'processing' | 'done';
  responseStatus?: number;
  responseBody?: unknown;
  createdAt: Date;
}

const idempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    requestHash: { type: String, required: true },
    state: { type: String, enum: ['processing', 'done'], default: 'processing' },
    responseStatus: Number,
    responseBody: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Scoped per user, so one person's key can never replay another's response.
idempotencyKeySchema.index({ userId: 1, key: 1 }, { unique: true });
idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const IdempotencyKey = mongoose.model<IIdempotencyKey>('IdempotencyKey', idempotencyKeySchema);
