import mongoose, { Schema, Document } from 'mongoose';
import { minorUnits, moneyJSON } from '../utils/money';

export interface IExpense extends Document {
  /** Integer minor units. */
  amount: number;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    amount: minorUnits({ required: true, min: 1 }),
    description: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    notes: String,
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: moneyJSON(['amount']) }
);

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
