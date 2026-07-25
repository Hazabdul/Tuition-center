import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInstitute extends Document {
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  address?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  country: string;
  postalCode?: string | null;
  logoUrl?: string | null;
  contactPersonName?: string | null;
  contactPersonPhone?: string | null;
  contactPersonEmail?: string | null;
  status: 'active' | 'suspended' | 'inactive' | 'pending' | 'deleted';
  studentLimit: number;
  teacherLimit: number;
  adminLimit: number;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InstituteSchema = new Schema<IInstitute>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    altPhone: { type: String, default: null, trim: true },
    address: { type: String, default: null },
    city: { type: String, default: null },
    stateRegion: { type: String, default: null },
    country: { type: String, default: 'India' },
    postalCode: { type: String, default: null },
    logoUrl: { type: String, default: null },
    contactPersonName: { type: String, default: null },
    contactPersonPhone: { type: String, default: null },
    contactPersonEmail: { type: String, default: null },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'suspended', 'inactive', 'pending', 'deleted'],
      index: true,
    },
    studentLimit: { type: Number, default: 100 },
    teacherLimit: { type: Number, default: 20 },
    adminLimit: { type: Number, default: 3 },
    notes: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

const Institute: Model<IInstitute> =
  mongoose.models.Institute || mongoose.model<IInstitute>('Institute', InstituteSchema);

export default Institute;
