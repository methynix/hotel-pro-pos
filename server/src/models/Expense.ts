import mongoose, { Schema, Document } from 'mongoose';
import { minorUnits, moneyJSON } from '../utils/money';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface IExpense extends Document {
  /** Integer minor units. */
  amount: number;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  /** pending -> approved -> paid, or pending -> rejected. Only `paid` touches the ledger. */
  status: ExpenseStatus;
  notes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  /** The ledger transaction that paid this expense, and the account it came from. */
  transactionId?: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  paidBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
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
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
    notes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: moneyJSON(['amount']) }
);

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
