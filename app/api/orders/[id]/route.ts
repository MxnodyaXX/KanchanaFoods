import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Staff from '@/models/Staff';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const order = await Order.findById(params.id).populate('staffId');
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    const { orderStatus, paymentStatus, paidAmount, cashReceived } = body;

    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const staff = await Staff.findById(order.staffId);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    // Prevent cancelling a completed order
    if (orderStatus === 'Cancelled' && order.orderStatus === 'Completed') {
      return NextResponse.json({ success: false, error: 'Completed orders cannot be cancelled.' }, { status: 400 });
    }

    // Handle payment confirmation (cash received for any unpaid order)
    if (cashReceived !== undefined) {
      const received = Number(cashReceived);
      const orderTotal = order.totalAmount;

      if (received >= orderTotal) {
        // Full payment: clear the unpaid balance that was added at order creation
        order.paidAmount = orderTotal;
        order.unpaidAmount = 0;
        order.paymentStatus = 'Paid';
        order.orderStatus = 'Confirmed';
        staff.unpaidBalance = Math.max(0, staff.unpaidBalance - orderTotal);

        const change = received - orderTotal;
        if (change > 0) {
          staff.walletBalance += change;
          await Payment.create({
            staffId: staff._id,
            staffName: staff.fullName,
            paymentDate: new Date(),
            amount: change,
            paymentType: 'AdvanceDeposit',
            relatedOrderId: order._id,
            note: `Overpayment balance added to wallet`,
          });
        }

        await Payment.create({
          staffId: staff._id,
          staffName: staff.fullName,
          paymentDate: new Date(),
          amount: orderTotal,
          paymentType: 'CashPayment',
          relatedOrderId: order._id,
          note: `Cash payment received`,
        });
      } else if (received > 0) {
        // Partial payment: reduce unpaid by what was received
        order.paidAmount = received;
        order.unpaidAmount = orderTotal - received;
        order.paymentStatus = 'Partial';
        staff.unpaidBalance = Math.max(0, staff.unpaidBalance - received);

        await Payment.create({
          staffId: staff._id,
          staffName: staff.fullName,
          paymentDate: new Date(),
          amount: received,
          paymentType: 'CashPayment',
          relatedOrderId: order._id,
          note: `Partial cash payment received`,
        });
      }

      await staff.save();
    }

    const previousOrderStatus = order.orderStatus;

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) order.paidAmount = paidAmount;

    // When order is cancelled, reverse wallet/unpaid changes
    if (orderStatus === 'Cancelled' && previousOrderStatus !== 'Cancelled') {
      if (order.walletUsedAmount > 0) {
        staff.walletBalance += order.walletUsedAmount;
      }
      if (order.unpaidAmount > 0) {
        staff.unpaidBalance = Math.max(0, staff.unpaidBalance - order.unpaidAmount);
      }
      order.paymentStatus = 'Cancelled';
      await staff.save();
    }

    await order.save();
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const staff = await Staff.findById(order.staffId);
    if (staff) {
      if (order.walletUsedAmount > 0) {
        staff.walletBalance += order.walletUsedAmount;
      }
      if (order.unpaidAmount > 0) {
        staff.unpaidBalance = Math.max(0, staff.unpaidBalance - order.unpaidAmount);
      }
      await staff.save();
    }

    await Order.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete order' }, { status: 500 });
  }
}
