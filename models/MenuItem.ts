import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  mealType: 'Breakfast' | 'Lunch';
  isAvailable: boolean;
  availableToday: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, default: 'Rice' },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    mealType: { type: String, enum: ['Breakfast', 'Lunch'], default: 'Lunch' },
    isAvailable: { type: Boolean, default: true },
    availableToday: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MenuItemSchema.index({ isAvailable: 1, availableToday: 1 });

const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

export default MenuItem;
