'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, AlertTriangle,
  ShoppingBag, Users, Calendar, Printer,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportData {
  period: { start: string; end: string };
  totalOrders: number;
  totalRevenue: number;
  totalPaid: number;
  totalUnpaid: number;
  staffSummary: Array<{
    staffName: string;
    department: string;
    totalOrders: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  }>;
  itemPopularity: Record<string, number>;
  unpaidStaff: Array<{
    _id: string;
    fullName: string;
    department: string;
    unpaidBalance: number;
    walletBalance: number;
  }>;
}

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'items' | 'unpaid'>('overview');

  const loadReport = useCallback(async () => {
    setLoading(true);
    let url = `/api/reports/monthly?period=${period}`;
    if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url);
    const result = await res.json();
    if (result.success) setData(result.data);
    setLoading(false);
  }, [period, startDate, endDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const sortedItems = data
    ? Object.entries(data.itemPopularity).sort((a, b) => b[1] - a[1])
    : [];

  const maxItemCount = sortedItems.length > 0 ? sortedItems[0][1] : 1;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Reports</h2>
          {data && (
            <p className="text-sm text-gray-500">
              {format(new Date(data.period.start), 'dd MMM')} – {format(new Date(data.period.end), 'dd MMM yyyy')}
            </p>
          )}
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm self-start sm:self-auto">
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setStartDate(''); setEndDate(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value && !startDate ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="date"
            className="input text-sm flex-1 min-w-0"
            style={{ minWidth: '130px' }}
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPeriod(''); }}
          />
          <span className="text-gray-400 text-sm flex-shrink-0">to</span>
          <input
            type="date"
            className="input text-sm flex-1 min-w-0"
            style={{ minWidth: '130px' }}
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPeriod(''); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">No data available for this period.</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="stat-card">
              <div className="bg-blue-100 p-2.5 sm:p-3 rounded-xl"><ShoppingBag className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-xs text-gray-500">Total Orders</p><p className="text-2xl font-bold text-blue-700">{data.totalOrders}</p></div>
            </div>
            <div className="stat-card">
              <div className="bg-green-100 p-2.5 sm:p-3 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-xs text-gray-500">Total Revenue</p><p className="text-lg sm:text-xl font-bold text-green-700">Rs. {data.totalRevenue.toFixed(0)}</p></div>
            </div>
            <div className="stat-card">
              <div className="bg-purple-100 p-2.5 sm:p-3 rounded-xl"><DollarSign className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-xs text-gray-500">Collected</p><p className="text-lg sm:text-xl font-bold text-purple-700">Rs. {data.totalPaid.toFixed(0)}</p></div>
            </div>
            <div className="stat-card">
              <div className="bg-red-100 p-2.5 sm:p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-xs text-gray-500">Outstanding</p><p className="text-lg sm:text-xl font-bold text-red-700">Rs. {data.totalUnpaid.toFixed(0)}</p></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'staff', label: 'By Staff', icon: Users },
              { id: 'items', label: 'Food Items', icon: ShoppingBag },
              { id: 'unpaid', label: 'Unpaid', icon: AlertTriangle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Total Revenue</span>
                  <span className="font-bold text-gray-900">Rs. {data.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Amount Collected</span>
                  <span className="font-bold text-green-700">Rs. {data.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 text-sm">Outstanding Amount</span>
                  <span className="font-bold text-red-600">Rs. {data.totalUnpaid.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 text-sm">Collection Rate</span>
                  <span className="font-bold text-primary-700">
                    {data.totalRevenue > 0 ? ((data.totalPaid / data.totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Staff Report */}
          {activeTab === 'staff' && (
            <div className="card p-0 overflow-hidden">
              {data.staffSummary.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No data</div>
              ) : (
                <>
                  {/* Mobile: cards */}
                  <div className="md:hidden divide-y divide-gray-50">
                    {data.staffSummary.sort((a, b) => b.totalAmount - a.totalAmount).map((s, i) => (
                      <div key={i} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{s.staffName}</p>
                            <p className="text-xs text-gray-400">{s.department}</p>
                          </div>
                          <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">{s.totalOrders} orders</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="text-center bg-gray-50 rounded-lg py-1.5">
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-sm font-bold text-gray-900">Rs. {s.totalAmount.toFixed(0)}</p>
                          </div>
                          <div className="text-center bg-green-50 rounded-lg py-1.5">
                            <p className="text-xs text-gray-500">Paid</p>
                            <p className="text-sm font-bold text-green-700">Rs. {s.paidAmount.toFixed(0)}</p>
                          </div>
                          <div className="text-center bg-red-50 rounded-lg py-1.5">
                            <p className="text-xs text-gray-500">Unpaid</p>
                            <p className={`text-sm font-bold ${s.unpaidAmount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                              {s.unpaidAmount > 0 ? `Rs. ${s.unpaidAmount.toFixed(0)}` : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="table-header">Staff</th>
                          <th className="table-header">Orders</th>
                          <th className="table-header">Total</th>
                          <th className="table-header">Paid</th>
                          <th className="table-header">Unpaid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.staffSummary.sort((a, b) => b.totalAmount - a.totalAmount).map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="table-cell">
                              <p className="font-medium text-gray-900">{s.staffName}</p>
                              <p className="text-xs text-gray-400">{s.department}</p>
                            </td>
                            <td className="table-cell text-center font-medium">{s.totalOrders}</td>
                            <td className="table-cell font-semibold">Rs. {s.totalAmount.toFixed(2)}</td>
                            <td className="table-cell text-green-700">Rs. {s.paidAmount.toFixed(2)}</td>
                            <td className="table-cell">
                              {s.unpaidAmount > 0 ? (
                                <span className="text-red-600 font-medium">Rs. {s.unpaidAmount.toFixed(2)}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Food Items */}
          {activeTab === 'items' && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Food Item Popularity</h3>
              {sortedItems.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No data</p>
              ) : (
                <div className="space-y-4">
                  {sortedItems.map(([name, count]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-700 truncate mr-2">{name}</span>
                        <span className="font-bold text-primary-700 flex-shrink-0">{count} portions</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                          style={{ width: `${(count / maxItemCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unpaid Staff */}
          {activeTab === 'unpaid' && (
            <div className="card p-0 overflow-hidden">
              {data.unpaidStaff.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No outstanding balances. Everyone is paid up!</p>
                </div>
              ) : (
                <>
                  {/* Mobile: cards */}
                  <div className="md:hidden divide-y divide-gray-50">
                    {data.unpaidStaff.map((s) => (
                      <div key={s._id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{s.fullName}</p>
                          <p className="text-xs text-gray-400">{s.department}</p>
                          {s.walletBalance > 0 && (
                            <p className="text-xs text-green-600 mt-0.5">Wallet: Rs. {s.walletBalance.toFixed(2)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">Rs. {s.unpaidBalance.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">unpaid</p>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-red-50 flex items-center justify-between border-t border-red-100">
                      <span className="font-semibold text-gray-700 text-sm">Total Outstanding</span>
                      <span className="font-bold text-red-700">Rs. {data.unpaidStaff.reduce((s, m) => s + m.unpaidBalance, 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="table-header">Staff</th>
                          <th className="table-header">Department</th>
                          <th className="table-header">Wallet</th>
                          <th className="table-header">Unpaid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.unpaidStaff.map((s) => (
                          <tr key={s._id} className="hover:bg-gray-50">
                            <td className="table-cell font-medium text-gray-900">{s.fullName}</td>
                            <td className="table-cell text-gray-500 text-sm">{s.department}</td>
                            <td className="table-cell">
                              {s.walletBalance > 0 ? (
                                <span className="text-green-700">Rs. {s.walletBalance.toFixed(2)}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="table-cell">
                              <span className="text-red-600 font-bold">Rs. {s.unpaidBalance.toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-red-50 border-t border-red-100">
                        <tr>
                          <td colSpan={3} className="table-cell font-semibold text-gray-700">Total Outstanding</td>
                          <td className="table-cell font-bold text-red-700">
                            Rs. {data.unpaidStaff.reduce((s, m) => s + m.unpaidBalance, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
