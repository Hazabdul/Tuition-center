import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExam extends Document {
  instituteId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId | null;
  subjectId?: mongoose.Types.ObjectId | null;
  name: string;
  code: string;
  examDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  totalMarks: number;
  passingMarks: number;
  academicYear?: string | null;
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'published';
  notes?: string | null;
  isPublished: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    examDate: { type: Date, default: null, index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    totalMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 35 },
    academicYear: { type: String, default: null },
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'scheduled', 'ongoing', 'completed', 'published'],
      index: true,
    },
    notes: { type: String, default: null },
    isPublished: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

ExamSchema.index({ instituteId: 1, code: 1 }, { unique: true });

const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);

export default Exam;
