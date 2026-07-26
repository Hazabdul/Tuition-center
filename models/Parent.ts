import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IParent extends Document {
  instituteId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  address?: string | null;
  relationship?: string | null;
  occupation?: string | null;
  notes?: string | null;
  children: mongoose.Types.ObjectId[];
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: null, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    altPhone: { type: String, default: null, trim: true },
    address: { type: String, default: null },
    relationship: { type: String, default: null },
    occupation: { type: String, default: null },
    notes: { type: String, default: null },
    children: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

ParentSchema.index({ instituteId: 1, email: 1 });
ParentSchema.index({ instituteId: 1, phone: 1 });

const Parent: Model<IParent> =
  mongoose.models.Parent || mongoose.model<IParent>('Parent', ParentSchema);

export default Parent;
