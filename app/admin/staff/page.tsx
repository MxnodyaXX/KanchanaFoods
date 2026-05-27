'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Search, Users, Wallet, AlertTriangle,
  X, Save, AlertCircle, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';

interface Staff {
  _id: string;
  fullName: string;
  department: string;
  phone: string;
  role: string;
  walletBalance: number;
  unpaidBalance: number;
  isActive: boolean;
}

interface OrderHistory {
  _id: string;
  createdAt: string;
  items: Array<{ itemName: string; quantity: number }>;
  totalAmount: number;
  paymentStatus: string;
}

interface PaymentHistory {
  _id: string;
  createdAt: string;
  amount: number;
  paymentType: string;
  note: string;
}

const DEPARTMENTS = ['Science', 'Mathematics', 'English', 'Tamil', 'History', 'Administration', 'Library', 'Physical Education', 'Arts', 'Other'];
const ROLES = ['Teacher', 'Admin Staff', 'Other'];

const emptyForm = { fullName: '', department: '', phone: '', role: 'Teacher', isActive: true };

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [history, setHistory] = useState<{ orders: OrderHistory[]; payments: PaymentHistory[] } | null>(null);
  const [walletModal, setWalletModal] = useState<Staff | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('');
  const [walletType, setWalletType] = useState<'AdvanceDeposit' | 'CreditSettlement' | 'Refund'>('AdvanceDeposit');

  const loadStaff = useCallback(async () => {
    const res = await fetch('/api/staff');
    const data = await res.json();
    if (data.success) setStaffList(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const openCreate = () => { setEditStaff(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (s: Staff) => {
    setEditStaff(s);
    setForm({ fullName: s.fullName, department: s.department, phone: s.phone, role: s.role, isActive: s.isActive });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.fullName || !form.department) { setError('Name and department are required.'); return; }
    setSaving(true); setError('');
    try {
      const res = editStaff
        ? await fetch(`/api/staff/${editStaff._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setShowForm(false); await loadStaff(); }
      else setError(data.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const loadHistory = async (staffId: string) => {
    if (expandedStaff === staffId) { setExpandedStaff(null); return; }
    const res = await fetch(`/api/staff/${staffId}/history`);
    const data = await res.json();
    if (data.success) { setHistory(data.data); setExpandedStaff(staffId); }
  };

  const handleWalletPayment = async () => {
    if (!walletModal || !walletAmount) return;
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: walletModal._id,
        amount: parseFloat(walletAmount),
        paymentType: walletType,
        note: walletNote,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setWalletModal(null);
      setWalletAmount('');
      setWalletNote('');
      await loadStaff();
    }
  };

  const filtered = staffList.filter((s) => {
    const matchSearch = !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || s.department === filterDept;
    return matchSearch && matchDept;
  });

  const departments = [...new Set(staffList.map((s) => s.department))].sort();

  const HistoryPanel = ({ staffId }: { staffId: string }) => {
    if (expandedStaff !== staffId || !history) return null;
    return (
      <div className="mt-3 bg-blue-50 rounded-xl p-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <h4 className="font-semibold text-gray-700 text-xs mb-2 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Recent Orders
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {history.orders.slice(0, 5).map((order) => (
                <div key={order._id} className="bg-white rounded-lg p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{format(new Date(order.createdAt), 'dd/MM/yy')}</span>
                    <span className="font-semibold">Rs. {order.totalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-gray-600 truncate">{order.items.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}</p>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs ${
                    order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                    order.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{order.paymentStatus}</span>
                </div>
              ))}
              {history.orders.length === 0 && <p className="text-xs text-gray-400">No orders yet</p>}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 text-xs mb-2">Recent Payments</h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {history.payments.slice(0, 5).map((pay) => (
                <div key={pay._id} className="bg-white rounded-lg p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{format(new Date(pay.createdAt), 'dd/MM/yy')}</span>
                    <span className={`font-semibold ${pay.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {pay.amount > 0 ? '+' : ''}Rs. {Math.abs(pay.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-500 truncate">{pay.paymentType}{pay.note && ` · ${pay.note}`}</p>
                </div>
              ))}
              {history.payments.length === 0 && <p className="text-xs text-gray-400">No payments yet</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Staff Members</h2>
          <p className="text-sm text-gray-500">{staffList.length} total · {staffList.filter((s) => s.isActive).length} active</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 text-sm w-full sm:w-48" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm flex-1 sm:flex-none sm:w-40" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="bg-blue-100 p-2.5 sm:p-3 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Total Staff</p><p className="text-xl font-bold text-blue-700">{staffList.length}</p></div>
        </div>
        <div className="stat-card">
          <div className="bg-green-100 p-2.5 sm:p-3 rounded-xl"><Wallet className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Wallet</p>
            <p className="text-lg sm:text-xl font-bold text-green-700">Rs. {staffList.reduce((s, m) => s + m.walletBalance, 0).toFixed(0)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="bg-red-100 p-2.5 sm:p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Unpaid</p>
            <p className="text-lg sm:text-xl font-bold text-red-700">Rs. {staffList.reduce((s, m) => s + m.unpaidBalance, 0).toFixed(0)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="bg-orange-100 p-2.5 sm:p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
          <div><p className="text-xs text-gray-500">Owing Staff</p><p className="text-xl font-bold text-orange-700">{staffList.filter((s) => s.unpaidBalance > 0).length}</p></div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No staff members found</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filtered.map((staff) => (
              <div key={staff._id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${staff.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{staff.fullName}</p>
                      <p className="text-xs text-gray-400">{staff.department} · {staff.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => openEdit(staff)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">
                      <Pencil className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button onClick={() => loadHistory(staff._id)} className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg">
                      {expandedStaff === staff._id ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-green-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Wallet</p>
                    <p className={`text-sm font-bold ${staff.walletBalance > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                      Rs. {staff.walletBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex-1 bg-red-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Unpaid</p>
                    <p className={`text-sm font-bold ${staff.unpaidBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      Rs. {staff.unpaidBalance.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => setWalletModal(staff)}
                    className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-2 rounded-lg h-full"
                  >
                    <Wallet className="w-3.5 h-3.5" /> Pay
                  </button>
                </div>

                <HistoryPanel staffId={staff._id} />
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Wallet</th>
                  <th className="table-header">Unpaid</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((staff) => (
                  <>
                    <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${staff.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{staff.fullName}</p>
                            <p className="text-xs text-gray-400">{staff.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{staff.role}</span>
                      </td>
                      <td className="table-cell">
                        <p className={`font-semibold ${staff.walletBalance > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                          Rs. {staff.walletBalance.toFixed(2)}
                        </p>
                      </td>
                      <td className="table-cell">
                        <p className={`font-semibold ${staff.unpaidBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          Rs. {staff.unpaidBalance.toFixed(2)}
                        </p>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setWalletModal(staff)} className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">
                            <Wallet className="w-3 h-3 inline mr-0.5" /> Pay
                          </button>
                          <button onClick={() => openEdit(staff)} className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => loadHistory(staff._id)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">
                            {expandedStaff === staff._id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedStaff === staff._id && history && (
                      <tr key={`${staff._id}-history`}>
                        <td colSpan={5} className="px-4 py-4 bg-blue-50">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-1">
                                <History className="w-4 h-4" /> Recent Orders
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {history.orders.slice(0, 5).map((order) => (
                                  <div key={order._id} className="bg-white rounded-lg p-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">{format(new Date(order.createdAt), 'dd/MM/yy')}</span>
                                      <span className="font-semibold">Rs. {order.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <p className="text-gray-600">{order.items.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}</p>
                                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs ${
                                      order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                      order.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>{order.paymentStatus}</span>
                                  </div>
                                ))}
                                {history.orders.length === 0 && <p className="text-xs text-gray-400">No orders yet</p>}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-700 text-sm mb-2">Recent Payments</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {history.payments.slice(0, 5).map((pay) => (
                                  <div key={pay._id} className="bg-white rounded-lg p-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">{format(new Date(pay.createdAt), 'dd/MM/yy')}</span>
                                      <span className={`font-semibold ${pay.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                                        {pay.amount > 0 ? '+' : ''}Rs. {Math.abs(pay.amount).toFixed(2)}
                                      </span>
                                    </div>
                                    <p className="text-gray-500">{pay.paymentType} {pay.note && `· ${pay.note}`}</p>
                                  </div>
                                ))}
                                {history.payments.length === 0 && <p className="text-xs text-gray-400">No payments yet</p>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editStaff ? 'Edit Staff' : 'Add Staff'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2 mb-4"><AlertCircle className="w-4 h-4" /> {error}</div>}
            <div className="space-y-4">
              <div><label className="label">Full Name *</label><input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div>
                <label className="label">Department *</label>
                <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  <option value="custom">Other (type below)</option>
                </select>
                {form.department === 'custom' && <input className="input mt-2" placeholder="Enter department" onChange={(e) => setForm({ ...form, department: e.target.value })} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="input" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Active staff member</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Payment Modal */}
      {walletModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setWalletModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="font-semibold text-gray-900">{walletModal.fullName}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <span className="text-green-600">Wallet: Rs. {walletModal.walletBalance.toFixed(2)}</span>
                <span className="text-red-600">Unpaid: Rs. {walletModal.unpaidBalance.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Payment Type</label>
                <select className="input" value={walletType} onChange={(e) => setWalletType(e.target.value as typeof walletType)}>
                  <option value="AdvanceDeposit">Advance Deposit (Add to Wallet)</option>
                  <option value="CreditSettlement">Credit Settlement (Clear Unpaid)</option>
                  <option value="Refund">Refund (Deduct from Wallet)</option>
                </select>
              </div>
              <div><label className="label">Amount (Rs.)</label><input type="number" className="input" placeholder="0.00" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} /></div>
              <div><label className="label">Note (Optional)</label><input className="input" placeholder="Payment note..." value={walletNote} onChange={(e) => setWalletNote(e.target.value)} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setWalletModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleWalletPayment} className="btn-primary flex-1">Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
