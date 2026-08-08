import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  amount: number;
  description: string;
  category: string;
  type: 'inflow' | 'outflow';
  status: 'completed' | 'pending' | 'failed';
  paymentMethod?: string;
  reference?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['inflow', 'outflow'], required: true },
    status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
    paymentMethod: String,
    reference: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
