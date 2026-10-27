import mongoose, { Schema, Document } from 'mongoose';
import { minorUnits, moneyJSON } from '../utils/money';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

// Only completed, non-voided transactions move account balances. Never write these
// directly; go through ledgerService so balances stay in step.
export interface ITransaction extends Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  type: TransactionType;
  /** Integer minor units (cents), always positive; `type` gives the direction. */
  amount: number;
  description: string;
  /** Income and expense only. */
  accountId?: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  /** Transfers only. */
  fromAccountId?: mongoose.Types.ObjectId;
  toAccountId?: mongoose.Types.ObjectId;
  /** When the money actually moved, as opposed to when it was recorded. */
  transactionDate: Date;
  status: TransactionStatus;
  paymentMethod?: string;
  reference?: string;
  recurringTransactionId?: mongoose.Types.ObjectId;
  /** Set when the transaction pays an approved expense. */
  expenseId?: mongoose.Types.ObjectId;
  // Ledger entries are never deleted. Voiding keeps the record, reverses its
  // effect on balances, and excludes it from every total.
  isVoided: boolean;
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    amount: minorUnits({ required: true, min: 1 }),
    description: { type: String, required: true, trim: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    fromAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    toAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    transactionDate: { type: Date, required: true },
    status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
    paymentMethod: String,
    reference: String,
    recurringTransactionId: { type: Schema.Types.ObjectId, ref: 'RecurringTransaction' },
    expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
    isVoided: { type: Boolean, default: false },
    voidedAt: Date,
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, toJSON: moneyJSON(['amount']) }
);

transactionSchema.index({ organizationId: 1, transactionDate: -1 });
transactionSchema.index({ organizationId: 1, categoryId: 1, transactionDate: -1 });
transactionSchema.index({ accountId: 1 });
transactionSchema.index({ fromAccountId: 1 });
transactionSchema.index({ toAccountId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
