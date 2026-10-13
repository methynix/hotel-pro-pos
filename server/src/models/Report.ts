import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  type: 'income' | 'expense' | 'cash_flow' | 'balance' | 'tax' | 'summary';
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense', 'cash_flow', 'balance', 'tax', 'summary'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', reportSchema);
