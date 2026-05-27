import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DailyStatus from '@/models/DailyStatus';
import { startOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();
    const dayStart = startOfDay(date);

    let status = await DailyStatus.findOne({ date: dayStart });

    if (!status) {
      status = await DailyStatus.create({
        date: dayStart,
        isOrderOpen: true,
        cutoffTime: '09:30',
        closedBy: '',
      });
    }

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('GET /api/daily-status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch daily status' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { isOrderOpen, cutoffTime, closedBy, date } = body;

    const targetDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());

    const update: Record<string, unknown> = {};
    if (isOrderOpen !== undefined) {
      update.isOrderOpen = isOrderOpen;
      if (!isOrderOpen) {
        update.closedBy = closedBy || 'Admin';
        update.closedAt = new Date();
      }
    }
    if (cutoffTime) update.cutoffTime = cutoffTime;

    const status = await DailyStatus.findOneAndUpdate(
      { date: targetDate },
      { $set: update },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('PATCH /api/daily-status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update daily status' }, { status: 500 });
  }
}
