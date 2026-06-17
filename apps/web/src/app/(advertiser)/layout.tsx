export default function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-white p-6">
        <div className="text-xl font-bold mb-8">ad-me <span className="text-sm font-normal text-gray-500">advertiser</span></div>
        <ul className="space-y-2 text-sm">
          <li><a href="/campaigns" className="block rounded px-3 py-2 hover:bg-gray-100">Campaigns</a></li>
          <li><a href="/billing" className="block rounded px-3 py-2 hover:bg-gray-100">Billing</a></li>
        </ul>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
