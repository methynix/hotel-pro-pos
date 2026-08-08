import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  type: 'income' | 'expense' | 'cash_flow' | 'summary';
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense', 'cash_flow', 'summary'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', reportSchema);
