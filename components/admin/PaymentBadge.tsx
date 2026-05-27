interface BadgeProps {
  status: string;
}

const paymentColors: Record<string, string> = {
  Paid: 'badge-paid',
  Unpaid: 'badge-unpaid',
  Partial: 'badge-partial',
  AdvanceUsed: 'badge-advance',
  Cancelled: 'badge-cancelled',
};

const orderColors: Record<string, string> = {
  Pending: 'badge-pending',
  Confirmed: 'badge-confirmed',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled',
};

export function PaymentBadge({ status }: BadgeProps) {
  const cls = paymentColors[status] || 'badge-cancelled';
  return (
    <span className={cls}>
      {status === 'AdvanceUsed' ? 'Advance Used' : status}
    </span>
  );
}

export function OrderStatusBadge({ status }: BadgeProps) {
  const cls = orderColors[status] || 'badge-cancelled';
  return <span className={cls}>{status}</span>;
}
