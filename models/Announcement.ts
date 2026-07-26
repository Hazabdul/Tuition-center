import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnouncement extends Document {
  instituteId: mongoose.Types.ObjectId;
  postedBy: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'event';
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      default: 'info',
      enum: ['info', 'warning', 'urgent', 'event'],
      index: true,
    },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ instituteId: 1, createdAt: -1 });

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

export default Announcement;
