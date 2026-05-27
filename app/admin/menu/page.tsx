'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, UtensilsCrossed, Save, X, AlertCircle,
} from 'lucide-react';

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

const CATEGORIES = ['Rice', 'Noodles', 'Bread', 'Soup', 'Snacks', 'Beverage', 'Dessert', 'Other'];

const emptyForm = {
  name: '',
  category: 'Rice',
  mealType: 'Lunch' as 'Breakfast' | 'Lunch',
  price: '',
  description: '',
  imageUrl: '',
  isAvailable: true,
  availableToday: true,
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/menu');
    const data = await res.json();
    if (data.success) setItems(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      mealType: item.mealType || 'Lunch',
      price: String(item.price),
      description: item.description,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      availableToday: item.availableToday,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      setError('Name and price are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const payload = { ...form, price: parseFloat(form.price) };
      const res = editItem
        ? await fetch(`/api/menu/${editItem._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        await loadItems();
      } else {
        setError(data.error || 'Failed to save.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailableToday = async (item: MenuItem) => {
    await fetch(`/api/menu/${item._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableToday: !item.availableToday }),
    });
    await loadItems();
  };

  const toggleAvailable = async (item: MenuItem) => {
    await fetch(`/api/menu/${item._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    await loadItems();
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await fetch(`/api/menu/${item._id}`, { method: 'DELETE' });
    await loadItems();
  };

  const filtered = items.filter((i) =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((g: Record<string, MenuItem[]>, item) => {
    if (!g[item.category]) g[item.category] = [];
    g[item.category].push(item);
    return g;
  }, {});

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Menu Items</h2>
          <p className="text-sm text-gray-500">{items.length} items · {items.filter((i) => i.availableToday).length} available today</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 text-sm w-52" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No menu items found. Add your first item!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catItems.map((item) => (
                  <div key={item._id} className={`card p-4 border-l-4 ${item.availableToday ? (item.mealType === 'Breakfast' ? 'border-l-amber-400' : 'border-l-primary-500') : 'border-l-gray-200'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.mealType === 'Breakfast' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                            {item.mealType}
                          </span>
                        </div>
                        <p className="text-primary-700 font-bold">Rs. {item.price.toFixed(2)}</p>
                      </div>
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover ml-2 flex-shrink-0" />
                      )}
                    </div>
                    {item.description && <p className="text-xs text-gray-500 mb-3">{item.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleAvailableToday(item)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                          item.availableToday ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {item.availableToday ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        Today
                      </button>
                      <button
                        onClick={() => toggleAvailable(item)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                          item.isAvailable ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {item.isAvailable ? 'Active' : 'Disabled'}
                      </button>
                      <button onClick={() => openEdit(item)} className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editItem ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Item Name *</label>
                <input className="input" placeholder="e.g., Chicken Rice" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Meal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Breakfast', 'Lunch'] as const).map((mt) => (
                    <button key={mt} type="button" onClick={() => setForm({ ...form, mealType: mt })}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.mealType === mt
                          ? mt === 'Breakfast' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {mt === 'Breakfast' ? '🌅 Breakfast' : '☀️ Lunch'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Price (Rs.) *</label>
                  <input type="number" className="input" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Image URL (Optional)</label>
                <input className="input" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
                  <span className="text-sm text-gray-700">Active / Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.availableToday} onChange={(e) => setForm({ ...form, availableToday: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
                  <span className="text-sm text-gray-700">Available Today</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
