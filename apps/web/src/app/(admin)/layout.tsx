'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      router.push('/earnings');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>;
  }

  if (user?.role !== 'admin') {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Redirecting...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-white p-6">
        <div className="text-xl font-bold mb-2">ad-me <span className="text-sm font-normal text-red-500">admin</span></div>
        <p className="text-sm text-gray-500 mb-8 truncate">{user?.email}</p>
        <ul className="space-y-2 text-sm">
          <li><a href="/overview" className="block rounded px-3 py-2 hover:bg-gray-100">Overview</a></li>
          <li><a href="/admin-campaigns" className="block rounded px-3 py-2 hover:bg-gray-100">Campaigns</a></li>
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
