'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, DollarSign, TrendingUp, AlertTriangle,
  Wallet, Search, CheckCircle, XCircle,
  Share2, Printer, RefreshCw, ToggleLeft, ToggleRight,
  Sunrise, Sun, SlidersHorizontal, X, Plus, Save,
  Trash2,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { PaymentBadge, OrderStatusBadge } from '@/components/admin/PaymentBadge';
import { format, addDays } from 'date-fns';

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

interface Staff {
  _id: string;
  fullName: string;
  department: string;
  walletBalance: number;
  unpaidBalance: number;
}

interface MenuItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  mealType: 'Breakfast' | 'Lunch';
  isAvailable: boolean;
  availableToday: boolean;
}

interface CartItem {
  menuItemId: string;
  itemName: string;
  price: number;
  quantity: number;
}

const emptyOrderForm = {
  staffId: '',
  mealType: 'Lunch' as 'Breakfast' | 'Lunch',
  paymentMethod: 'Cash',
  note: '',
};

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

  // Add order state
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

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

  const openAddOrder = async () => {
    setOrderForm(emptyOrderForm);
    setCart([]);
    setSelectedStaff(null);
    setOrderError('');
    const [staffRes, menuRes] = await Promise.all([fetch('/api/staff'), fetch('/api/menu')]);
    const [staffData, menuData] = await Promise.all([staffRes.json(), menuRes.json()]);
    if (staffData.success) setStaffList(staffData.data);
    if (menuData.success) setMenuItems(menuData.data);
    setShowAddOrder(true);
  };

  const handleStaffSelect = (staffId: string) => {
    const s = staffList.find((s) => s._id === staffId) || null;
    setSelectedStaff(s);
    setOrderForm((f) => ({ ...f, staffId }));
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) return prev.map((c) => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item._id, itemName: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const adjustQty = (menuItemId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.menuItemId !== menuItemId) return c;
      const qty = c.quantity + delta;
      return qty <= 0 ? c : { ...c, quantity: qty };
    }));
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handleSubmitOrder = async () => {
    if (!orderForm.staffId || cart.length === 0) {
      setOrderError('Please select a staff member and add at least one item.');
      return;
    }
    setSavingOrder(true);
    setOrderError('');
    try {
      const deliveryDate = orderForm.mealType === 'Breakfast'
        ? addDays(new Date(), 1)
        : new Date();

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: orderForm.staffId,
          items: cart,
          paymentMethod: orderForm.paymentMethod,
          mealType: orderForm.mealType,
          deliveryDate,
          note: orderForm.note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddOrder(false);
        await loadData();
      } else {
        setOrderError(data.error || 'Failed to create order.');
      }
    } finally {
      setSavingOrder(false);
    }
  };

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
      {/* Mark as Paid — for any unpaid or partial order */}
      {(order.paymentStatus === 'Unpaid' || order.paymentStatus === 'Partial') && order.orderStatus !== 'Cancelled' && (
        <button
          onClick={() => setShowCashModal(order)}
          disabled={updating === order._id}
          className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          Mark Paid
        </button>
      )}
      {/* Complete — order delivered to staff */}
      {order.orderStatus !== 'Completed' && order.orderStatus !== 'Cancelled' && (
        <button
          onClick={() => updateOrder(order._id, { orderStatus: 'Completed' })}
          disabled={updating === order._id}
          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          Complete
        </button>
      )}
      {/* Cancel */}
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

  const filteredMenu = menuItems.filter(
    (m) => m.mealType === orderForm.mealType && m.isAvailable
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

        <div className="flex gap-2">
          <button onClick={toggleOrders}
            className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors ${
              dailyStatus?.isOrderOpen
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            }`}>
            {dailyStatus?.isOrderOpen
              ? <><ToggleRight className="w-4 h-4" /> Close Orders</>
              : <><ToggleLeft className="w-4 h-4" /> Reopen Orders</>}
          </button>
          <button onClick={openAddOrder}
            className="flex items-center gap-2 font-semibold py-2.5 px-4 rounded-xl text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Order</span>
          </button>
        </div>
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
                  <div className="flex items-center gap-1.5">
                    <PaymentBadge status={order.paymentStatus} />
                    <OrderStatusBadge status={order.orderStatus} />
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

      {/* Cash / Mark Paid Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Mark as Paid</h3>
              <button onClick={() => setShowCashModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-1">{showCashModal.staffName} · {showCashModal.paymentMethod}</p>
            <p className="text-sm font-semibold text-gray-900 mb-4">Order Total: Rs. {showCashModal.totalAmount.toFixed(2)}</p>
            <div className="mb-4">
              <label className="label">Amount Received (Rs.)</label>
              <input
                type="number"
                className="input text-lg"
                placeholder={showCashModal.totalAmount.toFixed(2)}
                value={cashInput[showCashModal._id] || ''}
                onChange={(e) => setCashInput((prev) => ({ ...prev, [showCashModal._id]: e.target.value }))}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Extra amount will be added to staff wallet</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCashModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleCashPayment(showCashModal)} className="btn-primary flex-1">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add Order</h3>
              <button onClick={() => setShowAddOrder(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {orderError && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{orderError}</div>
              )}

              {/* Staff */}
              <div>
                <label className="label">Staff Member *</label>
                <select className="input" value={orderForm.staffId} onChange={(e) => handleStaffSelect(e.target.value)}>
                  <option value="">Select staff...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.fullName} — {s.department}</option>
                  ))}
                </select>
                {selectedStaff && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs flex gap-4">
                    <span className="text-green-600">Wallet: Rs. {selectedStaff.walletBalance.toFixed(2)}</span>
                    <span className="text-red-500">Unpaid: Rs. {selectedStaff.unpaidBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Meal Type */}
              <div>
                <label className="label">Meal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Breakfast', 'Lunch'] as const).map((mt) => (
                    <button key={mt} type="button"
                      onClick={() => { setOrderForm((f) => ({ ...f, mealType: mt })); setCart([]); }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        orderForm.mealType === mt
                          ? mt === 'Breakfast' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {mt === 'Breakfast' ? '🌅 Breakfast' : '☀️ Lunch'}
                    </button>
                  ))}
                </div>
                {orderForm.mealType === 'Breakfast' && (
                  <p className="text-xs text-amber-600 mt-1.5">Breakfast orders are for tomorrow ({format(addDays(new Date(), 1), 'dd MMM')})</p>
                )}
              </div>

              {/* Menu Items */}
              <div>
                <label className="label">Menu Items *</label>
                {filteredMenu.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No {orderForm.mealType} items available today.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {filteredMenu.map((item) => {
                      const inCart = cart.find((c) => c.menuItemId === item._id);
                      return (
                        <div key={item._id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${inCart ? 'border-primary-300 bg-primary-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">Rs. {item.price.toFixed(2)}</p>
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => adjustQty(item._id, -1)} className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center hover:bg-primary-200">−</button>
                              <span className="w-5 text-center text-sm font-bold text-primary-700">{inCart.quantity}</span>
                              <button onClick={() => adjustQty(item._id, 1)} className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center hover:bg-primary-200">+</button>
                              <button onClick={() => removeFromCart(item._id)} className="ml-1 text-red-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item)} className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-lg font-medium">Add</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart total */}
              {cart.length > 0 && (
                <div className="bg-primary-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-700">{cart.reduce((s, c) => s + c.quantity, 0)} item(s)</span>
                  <span className="font-bold text-primary-700">Total: Rs. {cartTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={orderForm.paymentMethod} onChange={(e) => setOrderForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="Cash">Cash (pay when collecting)</option>
                  <option value="Wallet">Wallet (deduct from balance)</option>
                  <option value="PayLater">Pay Later (add to unpaid)</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="label">Note (Optional)</label>
                <input className="input" placeholder="Any special instructions..." value={orderForm.note} onChange={(e) => setOrderForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowAddOrder(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSubmitOrder} disabled={savingOrder || cart.length === 0 || !orderForm.staffId}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {savingOrder ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
