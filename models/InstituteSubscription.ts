import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInstituteSubscription extends Document {
  instituteId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled' | 'pending_activation';
  startDate: Date;
  expiryDate: Date;
  performedBy?: mongoose.Types.ObjectId | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InstituteSubscriptionSchema = new Schema<IInstituteSubscription>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    status: {
      type: String,
      default: 'active',
      enum: ['trial', 'active', 'expired', 'suspended', 'cancelled', 'pending_activation'],
      index: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

InstituteSubscriptionSchema.index({ instituteId: 1, status: 1 });
InstituteSubscriptionSchema.index({ expiryDate: 1 });

const InstituteSubscription: Model<IInstituteSubscription> =
  mongoose.models.InstituteSubscription ||
  mongoose.model<IInstituteSubscription>(
    'InstituteSubscription',
    InstituteSubscriptionSchema
  );

export default InstituteSubscription;
