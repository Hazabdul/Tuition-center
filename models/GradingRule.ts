import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGradingRule extends Document {
  instituteId: mongoose.Types.ObjectId;
  minPercentage: number;
  maxPercentage: number;
  grade: string;
  createdAt: Date;
  updatedAt: Date;
}

const GradingRuleSchema = new Schema<IGradingRule>(
  {
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    minPercentage: { type: Number, required: true },
    maxPercentage: { type: Number, required: true },
    grade: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

GradingRuleSchema.index({ instituteId: 1, minPercentage: 1, maxPercentage: 1 });

const GradingRule: Model<IGradingRule> =
  mongoose.models.GradingRule ||
  mongoose.model<IGradingRule>('GradingRule', GradingRuleSchema);

export default GradingRule;
