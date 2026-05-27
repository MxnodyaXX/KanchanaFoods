import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyStatus extends Document {
  date: Date;
  isOrderOpen: boolean;
  cutoffTime: string;
  closedBy: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyStatusSchema = new Schema<IDailyStatus>(
  {
    date: { type: Date, required: true, unique: true },
    isOrderOpen: { type: Boolean, default: true },
    cutoffTime: { type: String, default: '09:30' },
    closedBy: { type: String, default: '' },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

DailyStatusSchema.index({ date: -1 });

const DailyStatus: Model<IDailyStatus> =
  mongoose.models.DailyStatus ||
  mongoose.model<IDailyStatus>('DailyStatus', DailyStatusSchema);

export default DailyStatus;
