import mongoose, { Schema, Document } from 'mongoose';
import { minorUnits, moneyJSON } from '../utils/money';

export interface IBudget extends Document {
  categoryId: mongoose.Types.ObjectId;
  /** Integer minor units. */
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  currentSpending: number;
  alertThreshold: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  /** Set when the over-threshold alert was sent; cleared when spending drops back under. */
  alertNotifiedAt?: Date;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: minorUnits({ required: true, min: 1 }),
    period: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
    currentSpending: minorUnits({ default: 0, min: 0 }),
    alertThreshold: { type: Number, default: 80, min: 0, max: 100 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    alertNotifiedAt: Date,
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: moneyJSON(['amount', 'currentSpending']) }
);

BudgetSchema.index({ organizationId: 1, isActive: 1 });
BudgetSchema.index({ categoryId: 1 });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);
