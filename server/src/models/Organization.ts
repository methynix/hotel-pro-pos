import mongoose, { Schema, Document } from 'mongoose';

// The tenant boundary. Every financial record belongs to an organization;
// users only reach it through a membership (see User.organizations).
export interface IOrganization extends Document {
  name: string;
  baseCurrency: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    baseCurrency: { type: String, default: 'TZS', uppercase: true, minlength: 3, maxlength: 3 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
