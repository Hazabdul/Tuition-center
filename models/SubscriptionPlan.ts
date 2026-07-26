import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  code: string;
  description?: string | null;
  monthlyPrice: number;
  annualPrice: number;
  studentLimit: number;
  teacherLimit: number;
  adminLimit: number;
  trialDurationDays: number;
  features?: string | null;
  status: 'active' | 'inactive';
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: null },
    monthlyPrice: { type: Number, required: true, default: 0 },
    annualPrice: { type: Number, required: true, default: 0 },
    studentLimit: { type: Number, default: 100 },
    teacherLimit: { type: Number, default: 10 },
    adminLimit: { type: Number, default: 2 },
    trialDurationDays: { type: Number, default: 0 },
    features: { type: String, default: null },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'inactive'],
      index: true,
    },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

const SubscriptionPlan: Model<ISubscriptionPlan> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);

export default SubscriptionPlan;
