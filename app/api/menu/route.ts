import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuItem from '@/models/MenuItem';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';
    const todayOnly = searchParams.get('today') === 'true';

    const query: Record<string, unknown> = {};
    if (availableOnly) query.isAvailable = true;
    if (todayOnly) query.availableToday = true;

    const items = await MenuItem.find(query).sort({ category: 1, name: 1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /api/menu error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, category, price, description, imageUrl, isAvailable, availableToday } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name and price are required' }, { status: 400 });
    }

    const item = await MenuItem.create({
      name,
      category: category || 'Rice',
      price: Number(price),
      description: description || '',
      imageUrl: imageUrl || '',
      isAvailable: isAvailable !== false,
      availableToday: availableToday !== false,
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create menu item' }, { status: 500 });
  }
}
