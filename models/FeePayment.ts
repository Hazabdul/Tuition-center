import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeePayment extends Document {
  instituteId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId | null;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: Date;
  paymentMode: 'cash' | 'card' | 'online' | 'cheque' | 'bank_transfer';
  transactionId?: string | null;
  notes?: string | null;
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  recordedBy?: mongoose.Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    receiptNumber: { type: String, required: true, trim: true },
    amountPaid: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now, index: true },
    paymentMode: {
      type: String,
      default: 'cash',
      enum: ['cash', 'card', 'online', 'cheque', 'bank_transfer'],
    },
    transactionId: { type: String, default: null },
    notes: { type: String, default: null },
    status: {
      type: String,
      default: 'completed',
      enum: ['completed', 'pending', 'failed', 'reversed'],
      index: true,
    },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

FeePaymentSchema.index({ instituteId: 1, receiptNumber: 1 }, { unique: true });

const FeePayment: Model<IFeePayment> =
  mongoose.models.FeePayment || mongoose.model<IFeePayment>('FeePayment', FeePaymentSchema);

export default FeePayment;
