import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  paymentDate: Date;
  amount: number;
  paymentType: 'CashPayment' | 'AdvanceDeposit' | 'WalletDeduction' | 'CreditSettlement' | 'Refund';
  relatedOrderId?: mongoose.Types.ObjectId;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName: { type: String, required: true },
    paymentDate: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ['CashPayment', 'AdvanceDeposit', 'WalletDeduction', 'CreditSettlement', 'Refund'],
      required: true,
    },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

PaymentSchema.index({ staffId: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ paymentType: 1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
