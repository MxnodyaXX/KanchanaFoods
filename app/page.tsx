import Link from 'next/link';
import { UtensilsCrossed, ShoppingBag, LayoutDashboard } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">School Catering</h1>
          <p className="text-gray-500 text-lg">Daily Food Order Management System</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/order"
            className="flex items-center justify-center gap-3 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-md"
          >
            <ShoppingBag className="w-5 h-5" />
            Place Your Food Order
          </Link>

          <Link
            href="/admin"
            className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl border border-gray-200 transition-colors duration-200 shadow-sm"
          >
            <LayoutDashboard className="w-5 h-5" />
            Admin Dashboard
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Catering management system for school staff
        </p>
      </div>
    </main>
  );
}
