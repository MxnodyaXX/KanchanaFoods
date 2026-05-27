import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IOrder extends Document {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  department: string;
  mealType: 'Breakfast' | 'Lunch';
  orderDate: Date;
  deliveryDate: Date;
  items: IOrderItem[];
  totalAmount: number;
  paymentMethod: 'Cash' | 'Wallet' | 'PayLater' | 'Mixed';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial' | 'AdvanceUsed';
  orderStatus: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  paidAmount: number;
  unpaidAmount: number;
  walletUsedAmount: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    itemName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName: { type: String, required: true },
    department: { type: String, required: true },
    mealType: { type: String, enum: ['Breakfast', 'Lunch'], default: 'Lunch' },
    orderDate: { type: Date, required: true, default: Date.now },
    deliveryDate: { type: Date, required: true, default: Date.now },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Wallet', 'PayLater', 'Mixed'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Partial', 'AdvanceUsed', 'Cancelled'],
      default: 'Unpaid',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    paidAmount: { type: Number, default: 0 },
    unpaidAmount: { type: Number, default: 0 },
    walletUsedAmount: { type: Number, default: 0 },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ staffId: 1 });
OrderSchema.index({ orderDate: -1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ staffId: 1, orderDate: 1 });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
