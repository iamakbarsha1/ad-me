'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && (user?.role === 'advertiser' || user?.role === 'admin')) {
      router.push('/campaigns');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role === 'advertiser' || user?.role === 'admin') {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-white p-6">
        <div className="text-xl font-bold mb-2">ad-me</div>
        <p className="text-sm text-gray-500 mb-8 truncate">{user?.email}</p>
        <ul className="space-y-2 text-sm">
          <li><a href="/earnings" className="block rounded px-3 py-2 hover:bg-gray-100">Earnings</a></li>
          <li><a href="/payouts" className="block rounded px-3 py-2 hover:bg-gray-100">Payouts</a></li>
          <li><a href="/leaderboard" className="block rounded px-3 py-2 hover:bg-gray-100">Leaderboard</a></li>
          <li><a href="/settings" className="block rounded px-3 py-2 hover:bg-gray-100">Settings</a></li>
        </ul>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="mt-8 w-full rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Sign out
        </button>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
