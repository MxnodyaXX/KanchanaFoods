'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Clock, Plus, Minus, CheckCircle,
  AlertCircle, UtensilsCrossed, User, Sunrise, Sun,
  CalendarDays,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface MenuItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  mealType: 'Breakfast' | 'Lunch';
  isAvailable: boolean;
  availableToday: boolean;
}

interface Staff {
  _id: string;
  fullName: string;
  department: string;
  walletBalance: number;
}

interface CartItem {
  menuItemId: string;
  itemName: string;
  price: number;
  quantity: number;
  mealType: 'Breakfast' | 'Lunch';
}

interface DailyStatus {
  isOrderOpen: boolean;
  cutoffTime: string;
}

interface OrderResult {
  mealType: string;
  totalAmount: number;
  paymentStatus: string;
  deliveryDate: string;
}

const today = new Date();
const tomorrow = addDays(today, 1);

export default function OrderPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Wallet' | 'PayLater'>('Cash');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [orderResults, setOrderResults] = useState<OrderResult[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/staff?active=true').then((r) => r.json()),
      fetch('/api/menu?available=true&today=true').then((r) => r.json()),
      fetch('/api/daily-status').then((r) => r.json()),
    ]).then(([staffData, menuData, statusData]) => {
      setStaff(staffData.data || []);
      setMenuItems(menuData.data || []);
      setDailyStatus(statusData.data || null);
      setLoading(false);
    });
  }, []);

  const filteredStaff = staff.filter(
    (s) =>
      s.fullName.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const breakfastItems = menuItems.filter((i) => i.mealType === 'Breakfast');
  const lunchItems = menuItems.filter((i) => i.mealType === 'Lunch');

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          itemName: item.name,
          price: item.price,
          quantity: 1,
          mealType: item.mealType,
        },
      ];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.menuItemId !== menuItemId);
    });
  };

  const getQuantity = (menuItemId: string) => {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity || 0;
  };

  const breakfastCart = cart.filter((c) => c.mealType === 'Breakfast');
  const lunchCart = cart.filter((c) => c.mealType === 'Lunch');

  const breakfastTotal = breakfastCart.reduce((s, i) => s + i.price * i.quantity, 0);
  const lunchTotal = lunchCart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalAmount = breakfastTotal + lunchTotal;

  const handleSubmit = async () => {
    if (!selectedStaff) { setError('Please select your name.'); return; }
    if (cart.length === 0) { setError('Please add at least one item.'); return; }

    setError('');
    setSubmitting(true);

    const results: OrderResult[] = [];
    let failed = false;

    const submitGroup = async (
      items: CartItem[],
      mealType: 'Breakfast' | 'Lunch',
      deliveryDate: Date
    ) => {
      if (items.length === 0) return;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff._id,
          items,
          paymentMethod,
          note,
          mealType,
          deliveryDate: deliveryDate.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        results.push({
          mealType,
          totalAmount: data.data.totalAmount,
          paymentStatus: data.data.paymentStatus,
          deliveryDate: deliveryDate.toISOString(),
        });
      } else {
        failed = true;
        setError(data.error || 'Failed to place order.');
      }
    };

    await submitGroup(breakfastCart, 'Breakfast', tomorrow);
    if (!failed) await submitGroup(lunchCart, 'Lunch', today);

    setSubmitting(false);
    if (!failed && results.length > 0) {
      setOrderResults(results);
      setSubmitted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (submitted && orderResults.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500 mb-5">Your order has been submitted successfully.</p>
          <div className="space-y-3 mb-6">
            {orderResults.map((r, i) => (
              <div key={i} className={`rounded-xl p-4 text-left ${r.mealType === 'Breakfast' ? 'bg-amber-50' : 'bg-primary-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {r.mealType === 'Breakfast' ? (
                    <Sunrise className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Sun className="w-4 h-4 text-primary-600" />
                  )}
                  <span className={`font-semibold text-sm ${r.mealType === 'Breakfast' ? 'text-amber-700' : 'text-primary-700'}`}>
                    {r.mealType}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Delivery: {format(new Date(r.deliveryDate), 'EEEE, dd MMMM yyyy')}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-bold text-gray-900">Rs. {r.totalAmount.toFixed(2)}</span>
                </div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.paymentStatus === 'Paid' || r.paymentStatus === 'AdvanceUsed'
                    ? 'bg-green-100 text-green-700'
                    : r.paymentStatus === 'Partial'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {r.paymentStatus === 'AdvanceUsed' ? 'Paid via Wallet' : r.paymentStatus}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setCart([]);
              setSelectedStaff(null);
              setStaffSearch('');
              setNote('');
              setPaymentMethod('Cash');
              setOrderResults([]);
            }}
            className="btn-primary w-full"
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  const isClosed = dailyStatus && !dailyStatus.isOrderOpen;

  const MenuItemRow = ({ item }: { item: MenuItem }) => {
    const qty = getQuantity(item._id);
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-opacity-80 transition-colors">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
          {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
          <p className="font-bold text-sm mt-0.5 text-primary-700">Rs. {item.price.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {qty > 0 ? (
            <>
              <button onClick={() => removeFromCart(item._id)} disabled={!!isClosed}
                className="w-8 h-8 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-full flex items-center justify-center transition-colors disabled:opacity-40">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold text-gray-900 text-sm">{qty}</span>
              <button onClick={() => addToCart(item)} disabled={!!isClosed}
                className="w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-40">
                <Plus className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => addToCart(item)} disabled={!!isClosed}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">
              Add
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-primary-700 text-white px-4 py-5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Daily Food Order</h1>
            <p className="text-primary-200 text-sm">{format(today, 'EEEE, dd MMMM yyyy')}</p>
          </div>
        </div>
      </div>

      {isClosed && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Orders are closed for today. Please check back tomorrow.</p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pb-40 pt-4 space-y-5">
        {/* Staff Selection */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" />
            Select Your Name
          </h2>
          <div className="relative">
            <input
              type="text"
              className="input"
              placeholder="Search your name or department..."
              value={selectedStaff ? selectedStaff.fullName : staffSearch}
              onChange={(e) => { setStaffSearch(e.target.value); setSelectedStaff(null); setShowStaffDropdown(true); }}
              onFocus={() => setShowStaffDropdown(true)}
            />
            {showStaffDropdown && filteredStaff.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                {filteredStaff.map((s) => (
                  <button key={s._id} className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0"
                    onClick={() => { setSelectedStaff(s); setStaffSearch(''); setShowStaffDropdown(false); }}>
                    <p className="font-medium text-gray-900 text-sm">{s.fullName}</p>
                    <p className="text-xs text-gray-500">{s.department}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedStaff && (
            <div className="mt-3 bg-primary-50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-primary-900 text-sm">{selectedStaff.fullName}</p>
                <p className="text-xs text-primary-600">{selectedStaff.department}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Wallet Balance</p>
                <p className="font-bold text-primary-700">Rs. {selectedStaff.walletBalance.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ======= BREAKFAST SECTION ======= */}
        {breakfastItems.length > 0 && (
          <div className="card border-l-4 border-l-amber-400">
            {/* Breakfast Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-amber-100 p-2.5 rounded-xl flex-shrink-0">
                <Sunrise className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Breakfast</h2>
                <div className="flex items-center gap-1.5 mt-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">
                    Ordering now for <span className="underline">tomorrow, {format(tomorrow, 'EEEE dd MMM')}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1">Book today → receive tomorrow morning</p>
              </div>
            </div>
            <div className="space-y-3">
              {breakfastItems.map((item) => <MenuItemRow key={item._id} item={item} />)}
            </div>
            {breakfastCart.length > 0 && (
              <div className="mt-3 bg-amber-50 rounded-lg px-3 py-2 flex justify-between text-sm">
                <span className="text-amber-700 font-medium">Breakfast subtotal</span>
                <span className="font-bold text-amber-800">Rs. {breakfastTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* ======= LUNCH SECTION ======= */}
        {lunchItems.length > 0 && (
          <div className="card border-l-4 border-l-primary-500">
            {/* Lunch Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-primary-100 p-2.5 rounded-xl flex-shrink-0">
                <Sun className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Lunch</h2>
                <div className="flex items-center gap-1.5 mt-1 bg-primary-50 border border-primary-200 rounded-lg px-3 py-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-primary-700">
                    For today, {format(today, 'EEEE dd MMM')}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Orders close at {dailyStatus?.cutoffTime?.replace(':', '.') || '9.30'} AM
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {lunchItems.map((item) => <MenuItemRow key={item._id} item={item} />)}
            </div>
            {lunchCart.length > 0 && (
              <div className="mt-3 bg-primary-50 rounded-lg px-3 py-2 flex justify-between text-sm">
                <span className="text-primary-700 font-medium">Lunch subtotal</span>
                <span className="font-bold text-primary-800">Rs. {lunchTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {menuItems.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No menu items available today.</p>
          </div>
        )}

        {/* Payment Method */}
        {cart.length > 0 && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Payment Method</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'Wallet', 'PayLater'] as const).map((method) => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    paymentMethod === method
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  {method === 'PayLater' ? 'Pay Later' : method === 'Wallet' ? 'Use Wallet' : 'Cash'}
                </button>
              ))}
            </div>
            {paymentMethod === 'Wallet' && selectedStaff && (
              <p className="text-xs text-gray-500 mt-2">Available: Rs. {selectedStaff.walletBalance.toFixed(2)}</p>
            )}
            {paymentMethod === 'PayLater' && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Food will be credited. Please settle later.
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {cart.length > 0 && (
          <div className="card">
            <label className="label">Special Notes (Optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="Any special instructions..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl px-4 pt-3 pb-6 max-w-lg mx-auto">
          <div className="space-y-1 mb-3">
            {breakfastCart.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-amber-700"><Sunrise className="w-3.5 h-3.5" /> Breakfast ({breakfastCart.reduce((s,i)=>s+i.quantity,0)} items) → tomorrow</span>
                <span className="font-semibold text-amber-800">Rs. {breakfastTotal.toFixed(2)}</span>
              </div>
            )}
            {lunchCart.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-primary-700"><Sun className="w-3.5 h-3.5" /> Lunch ({lunchCart.reduce((s,i)=>s+i.quantity,0)} items) → today</span>
                <span className="font-semibold text-primary-800">Rs. {lunchTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-1 mt-1">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-primary-700">Rs. {totalAmount.toFixed(2)}</span>
            </div>
          </div>
          {error && (
            <div className="mb-3 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting || !!isClosed}
            className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2">
            {submitting
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <ShoppingCart className="w-5 h-5" />}
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}
