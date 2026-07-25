import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLog extends Document {
  instituteId?: mongoose.Types.ObjectId | null;
  userId?: mongoose.Types.ObjectId | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    oldValues: { type: Schema.Types.Mixed, default: null },
    newValues: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
