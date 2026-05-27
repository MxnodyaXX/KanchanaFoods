import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Staff from '@/models/Staff';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = startOfDay(new Date(startDate));
      end = endOfDay(new Date(endDate));
    } else {
      switch (period) {
        case 'week':
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'yesterday':
          start = startOfDay(subDays(now, 1));
          end = endOfDay(subDays(now, 1));
          break;
        case 'today':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        default:
          start = startOfMonth(now);
          end = endOfMonth(now);
      }
    }

    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      orderStatus: { $ne: 'Cancelled' },
    }).sort({ orderDate: -1 });

    // Staff-wise summary
    const staffSummary: Record<string, {
      staffName: string;
      department: string;
      totalOrders: number;
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
    }> = {};

    for (const order of orders) {
      const key = order.staffId.toString();
      if (!staffSummary[key]) {
        staffSummary[key] = {
          staffName: order.staffName,
          department: order.department,
          totalOrders: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
        };
      }
      staffSummary[key].totalOrders++;
      staffSummary[key].totalAmount += order.totalAmount;
      staffSummary[key].paidAmount += order.paidAmount;
      staffSummary[key].unpaidAmount += order.unpaidAmount;
    }

    // Item popularity
    const itemPopularity: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.items) {
        itemPopularity[item.itemName] = (itemPopularity[item.itemName] || 0) + item.quantity;
      }
    }

    // Unpaid staff report
    const unpaidStaff = await Staff.find({ unpaidBalance: { $gt: 0 } }).sort({ unpaidBalance: -1 });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalUnpaid = orders.reduce((sum, o) => sum + o.unpaidAmount, 0);

    return NextResponse.json({
      success: true,
      data: {
        period: { start, end },
        totalOrders: orders.length,
        totalRevenue,
        totalPaid,
        totalUnpaid,
        staffSummary: Object.values(staffSummary),
        itemPopularity,
        unpaidStaff,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/monthly error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
