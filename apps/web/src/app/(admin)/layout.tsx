export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-white p-6">
        <div className="text-xl font-bold mb-8">ad-me <span className="text-sm font-normal text-red-500">admin</span></div>
        <ul className="space-y-2 text-sm">
          <li><a href="/overview" className="block rounded px-3 py-2 hover:bg-gray-100">Overview</a></li>
        </ul>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
