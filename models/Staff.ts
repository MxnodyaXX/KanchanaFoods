import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaff extends Document {
  fullName: string;
  department: string;
  phone: string;
  pin: string;
  role: 'Teacher' | 'Admin Staff' | 'Other';
  walletBalance: number;
  unpaidBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    fullName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    pin: { type: String, default: '' },
    role: {
      type: String,
      enum: ['Teacher', 'Admin Staff', 'Other'],
      default: 'Teacher',
    },
    walletBalance: { type: Number, default: 0, min: 0 },
    unpaidBalance: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StaffSchema.index({ fullName: 1 });
StaffSchema.index({ department: 1 });
StaffSchema.index({ isActive: 1 });

const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;
