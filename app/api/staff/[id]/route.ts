import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Staff from '@/models/Staff';
import Order from '@/models/Order';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const staff = await Staff.findById(params.id);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('GET /api/staff/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();

    const allowedFields = ['fullName', 'department', 'phone', 'role', 'isActive'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const staff = await Staff.findByIdAndUpdate(params.id, updateData, { new: true, runValidators: true });
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('PATCH /api/staff/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const staff = await Staff.findByIdAndDelete(params.id);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Staff deleted' });
  } catch (error) {
    console.error('DELETE /api/staff/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete staff' }, { status: 500 });
  }
}

// GET order history for a staff member
export async function OPTIONS(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const orders = await Order.find({ staffId: params.id }).sort({ createdAt: -1 }).limit(50);
    const payments = await Payment.find({ staffId: params.id }).sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ success: true, data: { orders, payments } });
  } catch (error) {
    console.error('OPTIONS /api/staff/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}
