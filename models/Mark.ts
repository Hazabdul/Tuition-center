import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMark extends Document {
  instituteId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId | null;
  maxMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade?: string | null;
  isPass: boolean;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MarkSchema = new Schema<IMark>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    maxMarks: { type: Number, default: 100 },
    obtainedMarks: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    grade: { type: String, default: null },
    isPass: { type: Boolean, default: true },
    remarks: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

MarkSchema.index({ instituteId: 1, examId: 1, studentId: 1 }, { unique: true });

const Mark: Model<IMark> =
  mongoose.models.Mark || mongoose.model<IMark>('Mark', MarkSchema);

export default Mark;
