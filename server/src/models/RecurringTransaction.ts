import mongoose, { Schema, Document } from 'mongoose';

export interface IRecurringTransaction extends Document {
  amount: number;
  description: string;
  category: string;
  type: 'inflow' | 'outflow';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: Date;
  lastExecuted?: Date;
  isActive: boolean;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringTransactionSchema = new Schema<IRecurringTransaction>(
  {
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['inflow', 'outflow'], required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
    nextDate: { type: Date, required: true, index: true },
    lastExecuted: Date,
    isActive: { type: Boolean, default: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

RecurringTransactionSchema.index({ userId: 1, isActive: 1 });
RecurringTransactionSchema.index({ nextDate: 1, isActive: 1 });

export const RecurringTransaction = mongoose.model<IRecurringTransaction>(
  'RecurringTransaction',
  RecurringTransactionSchema
);
