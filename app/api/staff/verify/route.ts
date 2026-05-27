import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Staff from '@/models/Staff';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ success: false, error: 'Phone number and PIN are required.' }, { status: 400 });
    }

    const staff = await Staff.findOne({ phone: phone.trim(), isActive: true });
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Phone number not registered. Contact admin.' }, { status: 404 });
    }

    if (!staff.pin) {
      return NextResponse.json({ success: false, error: 'PIN not set for this account. Contact admin.' }, { status: 400 });
    }

    const match = await bcrypt.compare(pin, staff.pin);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Incorrect PIN. Please try again.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: staff._id,
        fullName: staff.fullName,
        department: staff.department,
        walletBalance: staff.walletBalance,
        unpaidBalance: staff.unpaidBalance,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    console.error('POST /api/staff/verify error:', error);
    return NextResponse.json({ success: false, error: 'Verification failed.' }, { status: 500 });
  }
}
