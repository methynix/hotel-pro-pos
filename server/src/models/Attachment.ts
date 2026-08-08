import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment extends Document {
  transactionId?: mongoose.Types.ObjectId;
  expenseId?: mongoose.Types.ObjectId;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  mimeType: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 0 },
    fileType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

AttachmentSchema.index({ userId: 1, createdAt: -1 });
AttachmentSchema.index({ transactionId: 1 });
AttachmentSchema.index({ expenseId: 1 });

export const Attachment = mongoose.model<IAttachment>('Attachment', AttachmentSchema);
