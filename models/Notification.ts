import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  instituteId?: mongoose.Types.ObjectId | null;
  userId?: mongoose.Types.ObjectId | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
