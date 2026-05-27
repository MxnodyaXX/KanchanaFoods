import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Staff from '@/models/Staff';
import Payment from '@/models/Payment';
import DailyStatus from '@/models/DailyStatus';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const staffId = searchParams.get('staffId');
    const paymentStatus = searchParams.get('paymentStatus');
    const orderStatus = searchParams.get('orderStatus');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};

    if (dateParam) {
      const date = dateParam === 'today' ? new Date() : new Date(dateParam);
      query.orderDate = { $gte: startOfDay(date), $lte: endOfDay(date) };
    }
    if (staffId) query.staffId = staffId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (orderStatus) query.orderStatus = orderStatus;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { staffName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { staffId, items, paymentMethod, note, mealType, deliveryDate } = body;

    if (!staffId || !items || items.length === 0 || !paymentMethod) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if orders are open today
    const today = startOfDay(new Date());
    const dailyStatus = await DailyStatus.findOne({ date: today });
    if (dailyStatus && !dailyStatus.isOrderOpen) {
      return NextResponse.json({ success: false, error: 'Orders are closed for today' }, { status: 400 });
    }

    // Check cutoff time
    const cutoffTime = dailyStatus?.cutoffTime || '09:30';
    const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(cutoffHours, cutoffMinutes, 0, 0);
    if (now > cutoff && (!dailyStatus || dailyStatus.isOrderOpen)) {
      // Still allow if admin hasn't closed — only block if status is explicitly closed
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    const totalAmount = items.reduce(
      (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity,
      0
    );

    let paidAmount = 0;
    let unpaidAmount = 0;
    let walletUsedAmount = 0;
    let paymentStatus: string = 'Unpaid';
    let orderStatus: string = 'Pending';

    const payments: Array<{
      staffId: string;
      staffName: string;
      paymentDate: Date;
      amount: number;
      paymentType: string;
      note: string;
    }> = [];

    if (paymentMethod === 'Wallet') {
      if (staff.walletBalance >= totalAmount) {
        walletUsedAmount = totalAmount;
        paidAmount = totalAmount;
        paymentStatus = 'AdvanceUsed';
        orderStatus = 'Confirmed';
        staff.walletBalance -= totalAmount;

        payments.push({
          staffId: staff._id.toString(),
          staffName: staff.fullName,
          paymentDate: new Date(),
          amount: -totalAmount,
          paymentType: 'WalletDeduction',
          note: `Wallet deduction for order`,
        });
      } else if (staff.walletBalance > 0) {
        walletUsedAmount = staff.walletBalance;
        paidAmount = staff.walletBalance;
        unpaidAmount = totalAmount - staff.walletBalance;
        paymentStatus = 'Partial';
        staff.unpaidBalance += unpaidAmount;

        payments.push({
          staffId: staff._id.toString(),
          staffName: staff.fullName,
          paymentDate: new Date(),
          amount: -staff.walletBalance,
          paymentType: 'WalletDeduction',
          note: `Partial wallet deduction for order`,
        });
        staff.walletBalance = 0;
      } else {
        unpaidAmount = totalAmount;
        paymentStatus = 'Unpaid';
        staff.unpaidBalance += totalAmount;
      }
    } else if (paymentMethod === 'PayLater') {
      unpaidAmount = totalAmount;
      paymentStatus = 'Unpaid';
      staff.unpaidBalance += totalAmount;
    } else if (paymentMethod === 'Cash') {
      paidAmount = 0;
      unpaidAmount = totalAmount;
      paymentStatus = 'Unpaid';
      orderStatus = 'Pending';
      staff.unpaidBalance += totalAmount;
    }

    const orderItems = items.map((item: {
      menuItemId: string;
      itemName: string;
      price: number;
      quantity: number;
    }) => ({
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    }));

    const resolvedDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();

    const order = await Order.create({
      staffId: staff._id,
      staffName: staff.fullName,
      department: staff.department,
      mealType: mealType || 'Lunch',
      orderDate: new Date(),
      deliveryDate: resolvedDeliveryDate,
      items: orderItems,
      totalAmount,
      paymentMethod,
      paymentStatus,
      orderStatus,
      paidAmount,
      unpaidAmount,
      walletUsedAmount,
      note: note || '',
    });

    await staff.save();

    // Save payment transactions
    for (const p of payments) {
      await Payment.create({ ...p, relatedOrderId: order._id });
    }

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
