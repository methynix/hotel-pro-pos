import mongoose, { Schema, Document } from 'mongoose';
import { minorUnits, moneyJSON } from '../utils/money';

export interface IRecurringTransaction extends Document {
  /** Integer minor units. */
  amount: number;
  description: string;
  type: 'income' | 'expense';
  accountId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: Date;
  lastExecuted?: Date;
  lastError?: string;
  isActive: boolean;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringTransactionSchema = new Schema<IRecurringTransaction>(
  {
    amount: minorUnits({ required: true, min: 1 }),
    description: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
    nextDate: { type: Date, required: true, index: true },
    lastExecuted: Date,
    lastError: String,
    isActive: { type: Boolean, default: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: moneyJSON(['amount']) }
);

RecurringTransactionSchema.index({ organizationId: 1, isActive: 1 });
RecurringTransactionSchema.index({ nextDate: 1, isActive: 1 });

export const RecurringTransaction = mongoose.model<IRecurringTransaction>(
  'RecurringTransaction',
  RecurringTransactionSchema
);
