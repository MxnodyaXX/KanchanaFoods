import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const StaffSchema = new mongoose.Schema({
  fullName: String,
  department: String,
  phone: { type: String, default: '' },
  role: { type: String, default: 'Teacher' },
  walletBalance: { type: Number, default: 0 },
  unpaidBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const MenuItemSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  availableToday: { type: Boolean, default: true },
}, { timestamps: true });

const DailyStatusSchema = new mongoose.Schema({
  date: { type: Date, unique: true },
  isOrderOpen: { type: Boolean, default: true },
  cutoffTime: { type: String, default: '09:30' },
  closedBy: { type: String, default: '' },
  closedAt: Date,
}, { timestamps: true });

const Staff = mongoose.models.Staff || mongoose.model('Staff', StaffSchema);
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
const DailyStatus = mongoose.models.DailyStatus || mongoose.model('DailyStatus', DailyStatusSchema);

const seedStaff = [
  { fullName: 'Anitha Kumari', department: 'Science', phone: '0123456789', role: 'Teacher', walletBalance: 550, unpaidBalance: 0 },
  { fullName: 'Bala Murugan', department: 'Mathematics', phone: '0123456790', role: 'Teacher', walletBalance: 0, unpaidBalance: 350 },
  { fullName: 'Chandra Sekaran', department: 'English', phone: '0123456791', role: 'Teacher', walletBalance: 200, unpaidBalance: 0 },
  { fullName: 'Deepa Lakshmi', department: 'Tamil', phone: '0123456792', role: 'Teacher', walletBalance: 0, unpaidBalance: 0 },
  { fullName: 'Eswari Priya', department: 'History', phone: '0123456793', role: 'Teacher', walletBalance: 100, unpaidBalance: 0 },
  { fullName: 'Fathima Nisha', department: 'Administration', phone: '0123456794', role: 'Admin Staff', walletBalance: 0, unpaidBalance: 450 },
  { fullName: 'Ganesan Raja', department: 'Physical Education', phone: '0123456795', role: 'Teacher', walletBalance: 750, unpaidBalance: 0 },
  { fullName: 'Hema Malini', department: 'Arts', phone: '0123456796', role: 'Teacher', walletBalance: 0, unpaidBalance: 0 },
  { fullName: 'Indira Devi', department: 'Library', phone: '0123456797', role: 'Admin Staff', walletBalance: 300, unpaidBalance: 0 },
  { fullName: 'Jayakumar', department: 'Mathematics', phone: '0123456798', role: 'Teacher', walletBalance: 0, unpaidBalance: 0 },
  { fullName: 'Kavitha Rani', department: 'Science', phone: '0123456799', role: 'Teacher', walletBalance: 150, unpaidBalance: 200 },
  { fullName: 'Logesh Kumar', department: 'Administration', phone: '0123456800', role: 'Admin Staff', walletBalance: 0, unpaidBalance: 0 },
];

const seedMenuItems = [
  // Breakfast items
  { name: 'Roti & Egg Curry', category: 'Bread', mealType: 'Breakfast', price: 180, description: '2 rotis with egg curry', isAvailable: true, availableToday: true },
  { name: 'Idli & Sambar', category: 'Snacks', mealType: 'Breakfast', price: 150, description: '3 idlis with sambar and chutney', isAvailable: true, availableToday: true },
  { name: 'Dosa & Chutney', category: 'Bread', mealType: 'Breakfast', price: 160, description: 'Crispy dosa with coconut chutney', isAvailable: true, availableToday: true },
  { name: 'Bread & Omelette', category: 'Bread', mealType: 'Breakfast', price: 130, description: 'White bread with 2-egg omelette', isAvailable: true, availableToday: true },
  { name: 'Milo & Biscuits', category: 'Beverage', mealType: 'Breakfast', price: 80, description: 'Hot Milo with cream crackers', isAvailable: true, availableToday: true },
  // Lunch items
  { name: 'Chicken Rice', category: 'Rice', mealType: 'Lunch', price: 350, description: 'Fragrant rice with tender chicken', isAvailable: true, availableToday: true },
  { name: 'Fish Rice', category: 'Rice', mealType: 'Lunch', price: 320, description: 'Steamed rice with spiced fish curry', isAvailable: true, availableToday: true },
  { name: 'Egg Rice', category: 'Rice', mealType: 'Lunch', price: 280, description: 'Fried rice with egg', isAvailable: true, availableToday: true },
  { name: 'Vegetarian Rice', category: 'Rice', mealType: 'Lunch', price: 250, description: 'Mixed vegetable rice', isAvailable: true, availableToday: true },
  { name: 'Mutton Rice', category: 'Rice', mealType: 'Lunch', price: 400, description: 'Biryani rice with mutton', isAvailable: true, availableToday: false },
  { name: 'Chicken Noodles', category: 'Noodles', mealType: 'Lunch', price: 300, description: 'Stir-fried noodles with chicken', isAvailable: true, availableToday: true },
  { name: 'Vegetable Soup', category: 'Soup', mealType: 'Lunch', price: 150, description: 'Hot and nutritious vegetable soup', isAvailable: true, availableToday: true },
];

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected!\n');

  // Clear existing
  await Staff.deleteMany({});
  await MenuItem.deleteMany({});
  await DailyStatus.deleteMany({});
  console.log('🗑️  Cleared existing seed data\n');

  // Seed staff
  const createdStaff = await Staff.insertMany(seedStaff);
  console.log(`👥 Created ${createdStaff.length} staff members`);

  // Seed menu
  const createdMenu = await MenuItem.insertMany(seedMenuItems);
  console.log(`🍽️  Created ${createdMenu.length} menu items`);

  // Create today's daily status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await DailyStatus.create({ date: today, isOrderOpen: true, cutoffTime: '09:30' });
  console.log('📅 Created today\'s order status\n');

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Sample Staff:');
  seedStaff.slice(0, 3).forEach((s) => {
    console.log(`   - ${s.fullName} (${s.department}) | Wallet: Rs.${s.walletBalance} | Unpaid: Rs.${s.unpaidBalance}`);
  });
  console.log('\n🍽️  Sample Menu:');
  seedMenuItems.slice(0, 3).forEach((m) => {
    console.log(`   - ${m.name}: Rs.${m.price} (${m.availableToday ? 'Available today' : 'Not today'})`);
  });

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
