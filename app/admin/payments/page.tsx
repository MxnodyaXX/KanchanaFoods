'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Wallet, AlertTriangle, TrendingUp,
  Plus, Search, X, Save, AlertCircle,
  ArrowUpCircle, ArrowDownCircle, Users, CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  _id: string;
  staffName: string;
  paymentDate: string;
  amount: number;
  paymentType: string;
  note: string;
  createdAt: string;
}

interface Staff {
  _id: string;
  fullName: string;
  department: string;
  walletBalance: number;
  unpaidBalance: number;
}

const PAYMENT_TYPES = [
  { value: 'CashPayment', label: 'Cash Payment (against order)' },
  { value: 'AdvanceDeposit', label: 'Advance Deposit (add to wallet)' },
  { value: 'CreditSettlement', label: 'Credit Settlement (clear unpaid)' },
  { value: 'Refund', label: 'Refund (deduct from wallet)' },
];

const paymentTypeColors: Record<string, string> = {
  CashPayment: 'bg-green-100 text-green-700',
  AdvanceDeposit: 'bg-blue-100 text-blue-700',
  WalletDeduction: 'bg-purple-100 text-purple-700',
  CreditSettlement: 'bg-orange-100 text-orange-700',
  Refund: 'bg-red-100 text-red-700',
};

type Tab = 'transactions' | 'credit' | 'wallets';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    staffId: '',
    amount: '',
    paymentType: 'AdvanceDeposit',
    note: '',
    relatedOrderId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const loadData = useCallback(async () => {
    const [paymentsRes, staffRes] = await Promise.all([
      fetch('/api/payments?limit=200'),
      fetch('/api/staff'),
    ]);
    const [paymentsData, staffData] = await Promise.all([paymentsRes.json(), staffRes.json()]);
    if (paymentsData.success) setPayments(paymentsData.data);
    if (staffData.success) setStaff(staffData.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openPaymentModal = (s: Staff, type: 'CreditSettlement' | 'AdvanceDeposit' | 'Refund') => {
    setSelectedStaff(s);
    setForm({ staffId: s._id, amount: '', paymentType: type, note: '', relatedOrderId: '' });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.staffId || !form.amount || !form.paymentType) {
      setError('Please fill all required fields.');
      return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = await res.json();
      if (data.success) { setShowForm(false); await loadData(); }
      else setError(data.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleStaffSelect = (staffId: string) => {
    const s = staff.find((s) => s._id === staffId);
    setSelectedStaff(s || null);
    setForm((f) => ({ ...f, staffId }));
  };

  const totalIn = payments.filter((p) => ['CashPayment', 'AdvanceDeposit', 'CreditSettlement'].includes(p.paymentType)).reduce((s, p) => s + p.amount, 0);
  const totalOut = payments.filter((p) => ['WalletDeduction', 'Refund'].includes(p.paymentType)).reduce((s, p) => s + Math.abs(p.amount), 0);
  const totalWallets = staff.reduce((s, m) => s + m.walletBalance, 0);
  const totalUnpaid = staff.reduce((s, m) => s + m.unpaidBalance, 0);

  const filtered = payments.filter((p) => {
    const matchSearch = !search || p.staffName.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || p.paymentType === filterType;
    return matchSearch && matchType;
  });

  const creditStaff = staff.filter((s) => s.unpaidBalance > 0).sort((a, b) => b.unpaidBalance - a.unpaidBalance);
  const walletStaff = staff.filter((s) => s.walletBalance > 0).sort((a, b) => b.walletBalance - a.walletBalance);

  const totalCreditSearch = search.toLowerCase();
  const filteredCredit = creditStaff.filter((s) =>
    !search || s.fullName.toLowerCase().includes(totalCreditSearch) || s.department.toLowerCase().includes(totalCreditSearch)
  );
  const filteredWallets = walletStaff.filter((s) =>
    !search || s.fullName.toLowerCase().includes(totalCreditSearch) || s.department.toLowerCase().includes(totalCreditSearch)
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Payments & Wallet</h2>
          <p className="text-sm text-gray-500">{payments.length} transactions · {creditStaff.length} on credit · {walletStaff.length} with wallet</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); setForm({ staffId: '', amount: '', paymentType: 'AdvanceDeposit', note: '', relatedOrderId: '' }); setSelectedStaff(null); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="bg-green-100 p-2.5 sm:p-3 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Total Received</p><p className="text-lg sm:text-xl font-bold text-green-700">Rs. {totalIn.toFixed(0)}</p></div>
        </div>
        <div className="stat-card">
          <div className="bg-purple-100 p-2.5 sm:p-3 rounded-xl"><ArrowDownCircle className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-gray-500">Wallet Deductions</p><p className="text-lg sm:text-xl font-bold text-purple-700">Rs. {totalOut.toFixed(0)}</p></div>
        </div>
        <div className="stat-card">
          <div className="bg-blue-100 p-2.5 sm:p-3 rounded-xl"><Wallet className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Wallet Balance</p><p className="text-lg sm:text-xl font-bold text-blue-700">Rs. {totalWallets.toFixed(0)}</p></div>
        </div>
        <div className="stat-card">
          <div className="bg-red-100 p-2.5 sm:p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-gray-500">Total Credit</p><p className="text-lg sm:text-xl font-bold text-red-700">Rs. {totalUnpaid.toFixed(0)}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { id: 'transactions', label: 'Transactions', icon: CreditCard },
          { id: 'credit', label: 'Credit Customers', icon: AlertTriangle, count: creditStaff.length },
          { id: 'wallets', label: 'Wallets', icon: Wallet, count: walletStaff.length },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id as Tab); setSearch(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">{label}</span>
            {count !== undefined && count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search bar (shared) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder={activeTab === 'transactions' ? 'Search by staff name...' : 'Search staff...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === 'transactions' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <select className="input text-sm w-full sm:w-56" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label.split('(')[0].trim()}</option>)}
              <option value="WalletDeduction">Wallet Deduction</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No transactions found</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-50">
                {filtered.map((p) => (
                  <div key={p._id} className="p-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${p.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      {p.amount > 0 ? <ArrowUpCircle className="w-4 h-4 text-green-600" /> : <ArrowDownCircle className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm truncate">{p.staffName}</p>
                        <p className={`font-bold text-sm ml-2 flex-shrink-0 ${p.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {p.amount > 0 ? '+' : ''}Rs. {Math.abs(p.amount).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentTypeColors[p.paymentType] || 'bg-gray-100 text-gray-600'}`}>
                          {p.paymentType}
                        </span>
                        <span className="text-xs text-gray-400">{format(new Date(p.createdAt), 'dd/MM/yy HH:mm')}</span>
                        {p.note && <span className="text-xs text-gray-400 truncate">· {p.note}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Staff</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="table-cell text-xs text-gray-500">{format(new Date(p.createdAt), 'dd/MM/yy HH:mm')}</td>
                        <td className="table-cell font-medium text-gray-900">{p.staffName}</td>
                        <td className="table-cell">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentTypeColors[p.paymentType] || 'bg-gray-100 text-gray-600'}`}>
                            {p.paymentType}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`font-semibold flex items-center gap-1 ${p.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {p.amount > 0 ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                            Rs. {Math.abs(p.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="table-cell text-gray-400 text-xs">{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CREDIT CUSTOMERS TAB ── */}
      {activeTab === 'credit' && (
        <div className="card p-0 overflow-hidden">
          {filteredCredit.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">No credit customers</p>
              <p className="text-sm mt-1">All staff are fully paid up!</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {filteredCredit.length} staff owe money
                </p>
                <p className="text-sm font-bold text-red-700">
                  Total: Rs. {filteredCredit.reduce((s, m) => s + m.unpaidBalance, 0).toFixed(2)}
                </p>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredCredit.map((s) => (
                  <div key={s._id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-gray-400">{s.department}</p>
                      {s.walletBalance > 0 && (
                        <p className="text-xs text-green-600 mt-0.5">Wallet: Rs. {s.walletBalance.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-red-600">Rs. {s.unpaidBalance.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">owed</p>
                      </div>
                      <button
                        onClick={() => openPaymentModal(s, 'CreditSettlement')}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header">Staff</th>
                      <th className="table-header">Department</th>
                      <th className="table-header">Wallet Balance</th>
                      <th className="table-header">Amount Owed</th>
                      <th className="table-header">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCredit.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="table-cell font-semibold text-gray-900">{s.fullName}</td>
                        <td className="table-cell text-gray-500 text-sm">{s.department}</td>
                        <td className="table-cell">
                          {s.walletBalance > 0
                            ? <span className="text-green-700 font-medium">Rs. {s.walletBalance.toFixed(2)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-cell">
                          <span className="text-red-600 font-bold text-base">Rs. {s.unpaidBalance.toFixed(2)}</span>
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() => openPaymentModal(s, 'CreditSettlement')}
                            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                          >
                            Settle Debt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50 border-t border-red-100">
                    <tr>
                      <td colSpan={3} className="table-cell font-semibold text-gray-700">Total Outstanding</td>
                      <td className="table-cell font-bold text-red-700 text-base">
                        Rs. {filteredCredit.reduce((s, m) => s + m.unpaidBalance, 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── WALLETS TAB ── */}
      {activeTab === 'wallets' && (
        <div className="card p-0 overflow-hidden">
          {filteredWallets.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">No wallet balances</p>
              <p className="text-sm mt-1">No staff have advance deposits yet.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <Users className="w-4 h-4" /> {filteredWallets.length} staff have wallet balance
                </p>
                <p className="text-sm font-bold text-blue-700">
                  Total: Rs. {filteredWallets.reduce((s, m) => s + m.walletBalance, 0).toFixed(2)}
                </p>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredWallets.map((s) => (
                  <div key={s._id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.fullName}</p>
                      <p className="text-xs text-gray-400">{s.department}</p>
                      {s.unpaidBalance > 0 && (
                        <p className="text-xs text-red-500 mt-0.5">Owes: Rs. {s.unpaidBalance.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-blue-700">Rs. {s.walletBalance.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">balance</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => openPaymentModal(s, 'AdvanceDeposit')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2 py-1 rounded-lg"
                        >
                          Top Up
                        </button>
                        <button
                          onClick={() => openPaymentModal(s, 'Refund')}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-1 rounded-lg"
                        >
                          Refund
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header">Staff</th>
                      <th className="table-header">Department</th>
                      <th className="table-header">Unpaid Balance</th>
                      <th className="table-header">Wallet Balance</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredWallets.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="table-cell font-semibold text-gray-900">{s.fullName}</td>
                        <td className="table-cell text-gray-500 text-sm">{s.department}</td>
                        <td className="table-cell">
                          {s.unpaidBalance > 0
                            ? <span className="text-red-500 font-medium">Rs. {s.unpaidBalance.toFixed(2)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="table-cell">
                          <span className="text-blue-700 font-bold text-base">Rs. {s.walletBalance.toFixed(2)}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openPaymentModal(s, 'AdvanceDeposit')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                              Top Up
                            </button>
                            <button
                              onClick={() => openPaymentModal(s, 'Refund')}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                              Refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50 border-t border-blue-100">
                    <tr>
                      <td colSpan={3} className="table-cell font-semibold text-gray-700">Total Wallet Funds</td>
                      <td className="table-cell font-bold text-blue-700 text-base">
                        Rs. {filteredWallets.reduce((s, m) => s + m.walletBalance, 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2 mb-4"><AlertCircle className="w-4 h-4" /> {error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Staff Member *</label>
                <select className="input" value={form.staffId} onChange={(e) => handleStaffSelect(e.target.value)}>
                  <option value="">Select staff...</option>
                  {staff.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.department})</option>)}
                </select>
                {selectedStaff && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs flex gap-3">
                    <span className="text-green-600">Wallet: Rs. {selectedStaff.walletBalance.toFixed(2)}</span>
                    <span className="text-red-600">Unpaid: Rs. {selectedStaff.unpaidBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Payment Type *</label>
                <select className="input" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
                  {PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (Rs.) *</label>
                <input type="number" className="input" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Note (Optional)</label>
                <input className="input" placeholder="Payment reference..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>

              {form.paymentType === 'AdvanceDeposit' && form.amount && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  Rs. {parseFloat(form.amount || '0').toFixed(2)} will be added to {selectedStaff?.fullName || 'staff'}&apos;s wallet.
                </div>
              )}
              {form.paymentType === 'CreditSettlement' && form.amount && (
                <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700">
                  Rs. {parseFloat(form.amount || '0').toFixed(2)} will clear from their unpaid balance.
                </div>
              )}
              {form.paymentType === 'Refund' && form.amount && (
                <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                  Rs. {parseFloat(form.amount || '0').toFixed(2)} will be deducted from their wallet.
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
