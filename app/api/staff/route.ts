import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Staff from '@/models/Staff';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const staff = await Staff.find(query).select('-pin').sort({ fullName: 1 });
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('GET /api/staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { fullName, department, phone, role, pin } = body;

    if (!fullName || !department) {
      return NextResponse.json({ success: false, error: 'Full name and department are required' }, { status: 400 });
    }

    const hashedPin = pin && pin.trim() ? await bcrypt.hash(pin.trim(), 10) : '';

    const staff = await Staff.create({
      fullName,
      department,
      phone: phone || '',
      pin: hashedPin,
      role: role || 'Teacher',
      walletBalance: 0,
      unpaidBalance: 0,
      isActive: true,
    });

    return NextResponse.json({ success: true, data: staff }, { status: 201 });
  } catch (error) {
    console.error('POST /api/staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create staff member' }, { status: 500 });
  }
}
