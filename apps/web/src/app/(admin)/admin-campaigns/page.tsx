'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiAuthGet, apiAuthPatch } from '../../../lib/api';
import type { AdminCampaignRow } from '@ad-me/shared';

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiAuthGet<{ campaigns: AdminCampaignRow[]; page: number }>(`/admin/campaigns?page=${page}&limit=20`);
      setCampaigns(data.campaigns);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiAuthPatch(`/admin/campaigns/${id}`, { status });
      fetchCampaigns();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Campaign Moderation</h1>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Advertiser</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Budget</th>
                <th className="py-2 pr-4">Spent</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="py-2 pr-4 text-gray-600">{c.advertiserName}<br /><span className="text-xs text-gray-400">{c.advertiserEmail}</span></td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' :
                      c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      c.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>{c.status}</span>
                  </td>
                  <td className="py-2 pr-4">{formatINR(c.budget)}</td>
                  <td className="py-2 pr-4">{formatINR(c.spent)}</td>
                  <td className="py-2 space-x-1">
                    {c.status !== 'active' && <button onClick={() => updateStatus(c.id, 'active')} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Activate</button>}
                    {c.status !== 'paused' && <button onClick={() => updateStatus(c.id, 'paused')} className="rounded bg-yellow-500 px-2 py-1 text-xs text-white hover:bg-yellow-600">Pause</button>}
                    {c.status !== 'completed' && <button onClick={() => updateStatus(c.id, 'completed')} className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600">Complete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Previous</button>
            <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 text-sm">Next</button>
          </div>
        </>
      )}
    </div>
  );
}
