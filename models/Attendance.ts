import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  instituteId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId | null;
  studentId: mongoose.Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string | null;
  recordedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent', 'late', 'excused'],
    },
    remarks: { type: String, default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ instituteId: 1, studentId: 1, date: 1 }, { unique: true });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
