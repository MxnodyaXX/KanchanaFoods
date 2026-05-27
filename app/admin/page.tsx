'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, DollarSign, TrendingUp, AlertTriangle,
  Wallet, Search, CheckCircle, XCircle,
  Share2, Printer, RefreshCw, ToggleLeft, ToggleRight,
  Sunrise, Sun, SlidersHorizontal, X,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { PaymentBadge, OrderStatusBadge } from '@/components/admin/PaymentBadge';
import { format } from 'date-fns';

interface Order {
  _id: string;
  staffName: string;
  department: string;
  mealType: 'Breakfast' | 'Lunch';
  deliveryDate: string;
  items: { itemName: string; quantity: number; subtotal: number }[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  paidAmount: number;
  unpaidAmount: number;
  note: string;
  createdAt: string;
}

interface DailyReport {
  totalOrders: number;
  totalRevenue: number;
  totalPaid: number;
  totalUnpaid: number;
  itemSummary: Record<string, { count: number; revenue: number }>;
  orders: Order[];
}

interface DailyStatus {
  isOrderOpen: boolean;
  cutoffTime: string;
}

export default function AdminDashboard() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [cashInput, setCashInput] = useState<Record<string, string>>({});
  const [showCashModal, setShowCashModal] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reportRes, statusRes] = await Promise.all([
        fetch('/api/reports/daily?period=today'),
        fetch('/api/daily-status'),
      ]);
      const [reportData, statusData] = await Promise.all([reportRes.json(), statusRes.json()]);
      if (reportData.success) setReport(reportData.data);
      if (statusData.success) setDailyStatus(statusData.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleOrders = async () => {
    if (!dailyStatus) return;
    const res = await fetch('/api/daily-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOrderOpen: !dailyStatus.isOrderOpen, closedBy: 'Admin' }),
    });
    const data = await res.json();
    if (data.success) setDailyStatus(data.data);
  };

  const updateOrder = async (orderId: string, update: Record<string, unknown>) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert(data.error || 'Failed to update order.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleCashPayment = async (order: Order) => {
    const received = parseFloat(cashInput[order._id] || '0');
    if (isNaN(received) || received < 0) return;
    await updateOrder(order._id, { cashReceived: received, orderStatus: 'Confirmed' });
    setShowCashModal(null);
  };

  const generateWhatsApp = () => {
    if (!report) return;
    let msg = `*Food Preparation List - ${format(new Date(), 'dd/MM/yyyy')}*\n\n`;
    msg += `*Total Orders: ${report.totalOrders}*\n\n*Item Quantities:*\n`;
    Object.entries(report.itemSummary).forEach(([name, data]) => {
      msg += `• ${name}: ${data.count}\n`;
    });
    msg += `\n*Total Revenue: Rs. ${report.totalRevenue.toFixed(2)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const departments = Array.from(new Set(report?.orders.map((o) => o.department) || []));

  const filteredOrders = (report?.orders || []).filter((order) => {
    const matchSearch = !search ||
      order.staffName.toLowerCase().includes(search.toLowerCase()) ||
      order.department.toLowerCase().includes(search.toLowerCase()) ||
      order.items.some((i) => i.itemName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || order.paymentStatus === filterStatus;
    const matchDept = !filterDept || order.department === filterDept;
    return matchSearch && matchStatus && matchDept;
  });

  const OrderActions = ({ order }: { order: Order }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {order.paymentMethod === 'Cash' && order.paymentStatus === 'Unpaid' && (
        <button onClick={() => setShowCashModal(order)}
          className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
          Mark Paid
        </button>
      )}
      {order.orderStatus !== 'Completed' && order.orderStatus !== 'Cancelled' && (
        <button onClick={() => updateOrder(order._id, { orderStatus: 'Completed' })}
          disabled={updating === order._id}
          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          Complete
        </button>
      )}
      {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Completed' && (
        <button
          onClick={() => {
            if (confirm(`Cancel order for ${order.staffName}? This will reverse their balance.`)) {
              updateOrder(order._id, { orderStatus: 'Cancelled' });
            }
          }}
          disabled={updating === order._id}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          Cancel
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">

      {/* Top bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Today's Summary</p>
            <p className="text-base font-bold text-gray-900">{format(new Date(), 'EEE, dd MMM yyyy')}</p>
          </div>
          {/* Mobile: icon-only buttons */}
          <div className="flex items-center gap-1.5">
            <button onClick={loadData} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={generateWhatsApp} className="p-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors" title="WhatsApp">
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => window.print()} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="Print">
              <Printer className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Order toggle - full width on mobile */}
        <button onClick={toggleOrders}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors ${
            dailyStatus?.isOrderOpen
              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
          }`}>
          {dailyStatus?.isOrderOpen
            ? <><ToggleRight className="w-4 h-4" /> Close Orders for Today</>
            : <><ToggleLeft className="w-4 h-4" /> Reopen Orders</>}
        </button>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl p-3 flex items-center gap-2 text-sm font-medium ${
        dailyStatus?.isOrderOpen ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
      }`}>
        {dailyStatus?.isOrderOpen ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
        <span>Orders <strong>{dailyStatus?.isOrderOpen ? 'OPEN' : 'CLOSED'}</strong> · Cutoff: {dailyStatus?.cutoffTime}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatsCard title="Orders" value={String(report?.totalOrders || 0)} icon={ShoppingBag} color="blue" />
        <StatsCard title="Revenue" value={`Rs. ${(report?.totalRevenue || 0).toFixed(0)}`} icon={TrendingUp} color="green" />
        <StatsCard title="Collected" value={`Rs. ${(report?.totalPaid || 0).toFixed(0)}`} icon={DollarSign} color="purple" />
        <StatsCard title="Pending" value={`Rs. ${(report?.totalUnpaid || 0).toFixed(0)}`} icon={AlertTriangle} color="red" />
      </div>

      {/* Food Prep Summary */}
      {report && Object.keys(report.itemSummary).length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
            <Wallet className="w-4 h-4 text-primary-600" /> Food Preparation Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(report.itemSummary).map(([name, data]) => (
              <div key={name} className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">{data.count}</p>
                <p className="text-xs text-primary-600 font-medium mt-0.5 leading-tight">{name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Rs. {data.revenue.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="card p-0 overflow-hidden">
        {/* Search + Filter bar */}
        <div className="p-3 sm:p-4 border-b border-gray-100 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search name, dept or food..." className="input pl-9 text-sm"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || filterStatus || filterDept ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-300 text-gray-600'
              }`}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(filterStatus || filterDept) && <span className="w-1.5 h-1.5 bg-primary-600 rounded-full" />}
            </button>
          </div>
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="input text-sm flex-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Payment Status</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="AdvanceUsed">Advance Used</option>
              </select>
              <select className="input text-sm flex-1" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {(filterStatus || filterDept) && (
                <button onClick={() => { setFilterStatus(''); setFilterDept(''); }}
                  className="flex items-center justify-center gap-1 text-sm text-red-600 px-3 py-2 bg-red-50 rounded-lg hover:bg-red-100">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filteredOrders.map((order) => (
                <div key={order._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.staffName}</p>
                      <p className="text-xs text-gray-400">{order.department}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.mealType === 'Breakfast' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                      }`}>
                        {order.mealType === 'Breakfast' ? <Sunrise className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                        {order.mealType} · {order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM') : ''}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">Rs. {order.totalAmount.toFixed(2)}</p>
                      {order.unpaidAmount > 0 && (
                        <p className="text-xs text-red-500">Due: Rs. {order.unpaidAmount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {order.items.map((item, i) => (
                      <span key={i} className="inline-block mr-2 bg-gray-100 px-2 py-0.5 rounded">{item.quantity}× {item.itemName}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PaymentBadge status={order.paymentStatus} />
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                  </div>
                  <OrderActions order={order} />
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Staff</th>
                    <th className="table-header">Items</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Payment</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">{order.staffName}</p>
                        <p className="text-xs text-gray-400">{order.department}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.mealType === 'Breakfast' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                        }`}>
                          {order.mealType === 'Breakfast' ? <Sunrise className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                          {order.mealType} · {order.deliveryDate ? format(new Date(order.deliveryDate), 'dd MMM') : ''}
                        </span>
                      </td>
                      <td className="table-cell">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-gray-600">{item.quantity}× {item.itemName}</p>
                        ))}
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-gray-900">Rs. {order.totalAmount.toFixed(2)}</p>
                        {order.unpaidAmount > 0 && (
                          <p className="text-xs text-red-500">Due: Rs. {order.unpaidAmount.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="table-cell"><PaymentBadge status={order.paymentStatus} /></td>
                      <td className="table-cell"><OrderStatusBadge status={order.orderStatus} /></td>
                      <td className="table-cell"><OrderActions order={order} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Cash Payment Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Record Cash Payment</h3>
            <p className="text-sm text-gray-500 mb-4">{showCashModal.staffName} · Rs. {showCashModal.totalAmount.toFixed(2)}</p>
            <div className="mb-4">
              <label className="label">Cash Received (Rs.)</label>
              <input type="number" className="input text-lg" placeholder={showCashModal.totalAmount.toFixed(2)}
                value={cashInput[showCashModal._id] || ''}
                onChange={(e) => setCashInput((prev) => ({ ...prev, [showCashModal._id]: e.target.value }))}
                autoFocus />
              <p className="text-xs text-gray-400 mt-1">Extra amount will be added to staff wallet</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCashModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleCashPayment(showCashModal)} className="btn-primary flex-1">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
