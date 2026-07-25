import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  instituteId?: mongoose.Types.ObjectId | null;
  role: 'super_admin' | 'institute_admin' | 'teacher' | 'student' | 'parent';
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  studentId?: string | null;
  passwordHash: string;
  firstName: string;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null, index: true },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'institute_admin', 'teacher', 'student', 'parent'],
      index: true,
    },
    username: { type: String, default: null, trim: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    studentId: { type: String, default: null, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: null, trim: true },
    profilePhotoUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ instituteId: 1, username: 1 });
UserSchema.index({ instituteId: 1, email: 1 });
UserSchema.index({ instituteId: 1, phone: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
