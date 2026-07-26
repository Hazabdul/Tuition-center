import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  instituteId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  studentId: string;
  admissionNumber?: string | null;
  firstName: string;
  lastName?: string | null;
  fatherName?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  address?: string | null;
  academicYear?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    studentId: { type: String, required: true, trim: true },
    admissionNumber: { type: String, default: null, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: null, trim: true },
    fatherName: { type: String, default: null, trim: true },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: null },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    altPhone: { type: String, default: null, trim: true },
    address: { type: String, default: null },
    academicYear: { type: String, default: null },
    emergencyContactName: { type: String, default: null },
    emergencyContactPhone: { type: String, default: null },
    notes: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

StudentSchema.index({ instituteId: 1, studentId: 1 }, { unique: true });

const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student;
