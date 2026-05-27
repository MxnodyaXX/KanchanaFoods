import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Payment from '@/models/Payment';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const period = searchParams.get('period') || 'today';

    let start: Date;
    let end: Date;

    if (dateParam) {
      start = startOfDay(new Date(dateParam));
      end = endOfDay(new Date(dateParam));
    } else {
      const now = new Date();
      switch (period) {
        case 'yesterday':
          start = startOfDay(subDays(now, 1));
          end = endOfDay(subDays(now, 1));
          break;
        default:
          start = startOfDay(now);
          end = endOfDay(now);
      }
    }

    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      orderStatus: { $ne: 'Cancelled' },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const totalUnpaid = orders.reduce((sum, o) => sum + o.unpaidAmount, 0);

    // Food item wise summary
    const itemSummary: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!itemSummary[item.itemName]) {
          itemSummary[item.itemName] = { count: 0, revenue: 0 };
        }
        itemSummary[item.itemName].count += item.quantity;
        itemSummary[item.itemName].revenue += item.subtotal;
      }
    }

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    for (const order of orders) {
      paymentBreakdown[order.paymentMethod] = (paymentBreakdown[order.paymentMethod] || 0) + 1;
    }

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const order of orders) {
      statusBreakdown[order.paymentStatus] = (statusBreakdown[order.paymentStatus] || 0) + 1;
    }

    const payments = await Payment.find({
      paymentDate: { $gte: start, $lte: end },
    });

    const cashCollected = payments
      .filter((p) => p.paymentType === 'CashPayment')
      .reduce((sum, p) => sum + p.amount, 0);

    const advanceDeposited = payments
      .filter((p) => p.paymentType === 'AdvanceDeposit')
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        period: { start, end },
        totalOrders,
        totalRevenue,
        totalPaid,
        totalUnpaid,
        cashCollected,
        advanceDeposited,
        itemSummary,
        paymentBreakdown,
        statusBreakdown,
        orders,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/daily error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
