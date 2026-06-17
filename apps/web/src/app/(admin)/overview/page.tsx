'use client';

import { useEffect, useState } from 'react';
import { apiAuthGet } from '../../../lib/api';
import type { AdminStats } from '@ad-me/shared';

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiAuthGet<AdminStats>('/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!stats) return <div className="text-gray-500">Loading stats...</div>;

  const cards = [
    { label: 'Users', value: stats.totalUsers },
    { label: 'Advertisers', value: stats.totalAdvertisers },
    { label: 'Campaigns', value: stats.totalCampaigns },
    { label: 'Ads', value: stats.totalAds },
    { label: 'Impressions', value: stats.totalImpressions.toLocaleString() },
    { label: 'Clicks', value: stats.totalClicks.toLocaleString() },
    { label: 'Total Revenue', value: formatINR(stats.totalEarningsPaise) },
    { label: 'Advertiser Balances', value: formatINR(stats.totalAdvertiserBalancePaise) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-2xl font-semibold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
