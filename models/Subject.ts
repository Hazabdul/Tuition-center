import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubject extends Document {
  instituteId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string | null;
  maxMarks: number;
  passingMarks: number;
  syllabus?: string | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    maxMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 35 },
    syllabus: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

SubjectSchema.index({ instituteId: 1, code: 1 }, { unique: true });

const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
