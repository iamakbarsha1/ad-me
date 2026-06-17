export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-white p-6">
        <div className="text-xl font-bold mb-8">ad-me</div>
        <ul className="space-y-2 text-sm">
          <li><a href="/earnings" className="block rounded px-3 py-2 hover:bg-gray-100">Earnings</a></li>
          <li><a href="/payouts" className="block rounded px-3 py-2 hover:bg-gray-100">Payouts</a></li>
          <li><a href="/leaderboard" className="block rounded px-3 py-2 hover:bg-gray-100">Leaderboard</a></li>
          <li><a href="/settings" className="block rounded px-3 py-2 hover:bg-gray-100">Settings</a></li>
        </ul>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
