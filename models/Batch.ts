import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatch extends Document {
  instituteId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string | null;
  academicYear?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  maxStudents?: number;
  students: mongoose.Types.ObjectId[];
  teachers: mongoose.Types.ObjectId[];
  subjects: mongoose.Types.ObjectId[];
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    academicYear: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    maxStudents: { type: Number, default: 50 },
    students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    teachers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

BatchSchema.index({ instituteId: 1, code: 1 }, { unique: true });

const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
