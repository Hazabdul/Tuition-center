import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacher extends Document {
  instituteId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  teacherId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  joiningDate?: Date | null;
  notes?: string | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    teacherId: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: null, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    qualification: { type: String, default: null },
    specialization: { type: String, default: null },
    joiningDate: { type: Date, default: null },
    notes: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

TeacherSchema.index({ instituteId: 1, teacherId: 1 }, { unique: true });

const Teacher: Model<ITeacher> =
  mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);

export default Teacher;
