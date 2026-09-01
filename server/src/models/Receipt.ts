import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt extends Document {
  transactionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  receiptNumber: string;
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
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiptNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
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
  { timestamps: true }
);

ReceiptSchema.index({ userId: 1, createdAt: -1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
