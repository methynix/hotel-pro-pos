import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  name: string;
  accountNumber: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit';
  status: 'active' | 'inactive';
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true },
    accountNumber: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'USD' },
    type: { type: String, enum: ['checking', 'savings', 'credit'], required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Account = mongoose.model<IAccount>('Account', accountSchema);
