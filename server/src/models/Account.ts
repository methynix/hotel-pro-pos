import mongoose, { Schema, Document } from 'mongoose';
import { minorUnits, moneyJSON } from '../utils/money';

export type AccountType = 'checking' | 'savings' | 'credit';

// For checking and savings, the balance is money held. For credit it is the
// amount owed, so spending on a credit account increases it.
export interface IAccount extends Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  accountNumber: string;
  /** Integer minor units. What the account held before any recorded transaction. */
  openingBalance: number;
  /** Integer minor units. Maintained by ledgerService; never set it directly. */
  currentBalance: number;
  currency: string;
  type: AccountType;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    openingBalance: minorUnits({ required: true, default: 0 }),
    currentBalance: minorUnits({ required: true, default: 0 }),
    currency: { type: String, default: 'TZS', uppercase: true },
    type: { type: String, enum: ['checking', 'savings', 'credit'], required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true, toJSON: moneyJSON(['openingBalance', 'currentBalance']) }
);

// Account numbers only need to be unique within one organization.
accountSchema.index({ organizationId: 1, accountNumber: 1 }, { unique: true });

export const Account = mongoose.model<IAccount>('Account', accountSchema);
