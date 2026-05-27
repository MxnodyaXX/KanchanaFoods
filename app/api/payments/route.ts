import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Staff from '@/models/Staff';
import Order from '@/models/Order';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const paymentType = searchParams.get('paymentType');
    const limit = Number(searchParams.get('limit')) || 100;

    const query: Record<string, unknown> = {};
    if (staffId) query.staffId = staffId;
    if (paymentType) query.paymentType = paymentType;

    const payments = await Payment.find(query).sort({ createdAt: -1 }).limit(limit);
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { staffId, amount, paymentType, relatedOrderId, note } = body;

    if (!staffId || !amount || !paymentType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    const numAmount = Number(amount);

    // Handle different payment types and update staff balances
    if (paymentType === 'AdvanceDeposit') {
      staff.walletBalance += numAmount;
    } else if (paymentType === 'CashPayment') {
      // Cash payment against unpaid orders
      if (relatedOrderId) {
        const order = await Order.findById(relatedOrderId);
        if (order) {
          const settleAmount = Math.min(numAmount, order.unpaidAmount);
          order.paidAmount += settleAmount;
          order.unpaidAmount -= settleAmount;

          if (order.unpaidAmount <= 0) {
            order.paymentStatus = 'Paid';
            order.unpaidAmount = 0;
          } else {
            order.paymentStatus = 'Partial';
          }

          // Excess goes to wallet
          const excess = numAmount - settleAmount;
          if (excess > 0) {
            staff.walletBalance += excess;
          }

          staff.unpaidBalance = Math.max(0, staff.unpaidBalance - settleAmount);
          await order.save();
        }
      } else {
        // General cash payment — apply to unpaid balance
        const settleAmount = Math.min(numAmount, staff.unpaidBalance);
        staff.unpaidBalance = Math.max(0, staff.unpaidBalance - settleAmount);

        const excess = numAmount - settleAmount;
        if (excess > 0) {
          staff.walletBalance += excess;
        }
      }
    } else if (paymentType === 'CreditSettlement') {
      staff.unpaidBalance = Math.max(0, staff.unpaidBalance - numAmount);
    } else if (paymentType === 'Refund') {
      staff.walletBalance = Math.max(0, staff.walletBalance - numAmount);
    } else if (paymentType === 'WalletDeduction') {
      staff.walletBalance = Math.max(0, staff.walletBalance - numAmount);
    }

    await staff.save();

    const payment = await Payment.create({
      staffId: staff._id,
      staffName: staff.fullName,
      paymentDate: new Date(),
      amount: numAmount,
      paymentType,
      relatedOrderId: relatedOrderId || undefined,
      note: note || '',
    });

    return NextResponse.json({ success: true, data: payment, staff }, { status: 201 });
  } catch (error) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 500 });
  }
}
