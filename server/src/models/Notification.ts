import mongoose, { Schema, Document } from 'mongoose';

export type NotificationCategory = 'account' | 'security' | 'budget' | 'summary';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  category: NotificationCategory;
  title: string;
  message: string;
  /** In-app path to open when the notification is clicked, e.g. /app/budgets */
  link?: string;
  read: boolean;
  emailed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: ['account', 'security', 'budget', 'summary'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
    emailed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// Keep the collection small: notifications expire after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
