import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
  categoryId: mongoose.Types.ObjectId;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  currentSpending: number;
  alertThreshold: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, required: true, min: 0 },
    period: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
    currentSpending: { type: Number, default: 0, min: 0 },
    alertThreshold: { type: Number, default: 80, min: 0, max: 100 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, isActive: 1 });
BudgetSchema.index({ categoryId: 1, userId: 1 });

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);
