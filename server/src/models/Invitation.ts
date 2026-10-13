import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/api';

// A pending invite to join an organization. Only the SHA-256 of the token
// is stored, so a database leak doesn't hand out working invite links.
export interface IInvitation extends Document {
  organizationId: mongoose.Types.ObjectId;
  email: string;
  role: UserRole;
  tokenHash: string;
  invitedBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'manager', 'operator', 'viewer'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
  },
  { timestamps: true }
);

invitationSchema.index({ organizationId: 1, email: 1 });
// Clean up a month after expiry; pending lookups also check expiresAt.
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
