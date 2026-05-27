import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const orders = await Order.find({ staffId: params.id }).sort({ createdAt: -1 }).limit(50);
    const payments = await Payment.find({ staffId: params.id }).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ success: true, data: { orders, payments } });
  } catch (error) {
    console.error('GET /api/staff/[id]/history error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}
