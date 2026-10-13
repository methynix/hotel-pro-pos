import mongoose, { Schema, Document } from 'mongoose';
import { fromMinor } from '../utils/money';

export interface IReceipt extends Document {
  transactionId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  receiptNumber: string;
  /** Integer minor units, as are the item prices. */
  amount: number;
  currency: string;
  description: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  paymentMethod: string;
  status: 'generated' | 'printed' | 'emailed';
  printCount: number;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiptNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'TZS' },
    description: { type: String, required: true },
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      },
    ],
    paymentMethod: { type: String, enum: ['cash', 'card', 'check', 'transfer', 'other'], required: true },
    status: { type: String, enum: ['generated', 'printed', 'emailed'], default: 'generated' },
    printCount: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.amount = fromMinor(ret.amount);
        ret.items = (ret.items || []).map((i: any) => ({ ...i, unitPrice: fromMinor(i.unitPrice), total: fromMinor(i.total) }));
        return ret;
      },
    },
  }
);

ReceiptSchema.index({ organizationId: 1, createdAt: -1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
