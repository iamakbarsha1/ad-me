'use client';

import { useState, useEffect } from 'react';
import { apiAuthGet } from '../../../lib/api';

interface EarningsSummary {
  todayPaise?: number;
  today?: number;
  thisMonthPaise?: number;
  thisMonth?: number;
  lifetimePaise?: number;
  lifetime?: number;
}

interface EarningEvent {
  id: string;
  type: 'impression' | 'click';
  amountPaise?: number;
  amount?: number;
  createdAt: string;
  adTitle?: string;
  surface?: string;
}

interface EarningsHistoryResponse {
  events?: EarningEvent[];
  history?: EarningEvent[];
  total?: number;
  page?: number;
}

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toFixed(2);
}

function TypeBadge({ type }: { type: string }) {
  return type === 'click' ? (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">click</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">impression</span>
  );
}

export default function EarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');

  const [events, setEvents] = useState<EarningEvent[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadHistory(page);
  }, [page]);

  async function loadSummary() {
    try {
      const data = await apiAuthGet<EarningsSummary>('/earnings/summary');
      setSummary(data);
    } catch (e) {
      setSummaryError((e as Error).message);
    }
  }

  async function loadHistory(p: number) {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await apiAuthGet<EarningsHistoryResponse>(`/earnings/history?page=${p}&limit=${LIMIT}`);
      const list = data.events ?? data.history ?? [];
      setEvents(list);
      setHasMore(list.length === LIMIT);
    } catch (e) {
      setHistoryError((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  function getPaise(data: EarningsSummary, todayKey: 'todayPaise' | 'today', altKey: 'todayPaise' | 'today'): number {
    return (data[todayKey] as number | undefined) ?? (data[altKey] as number | undefined) ?? 0;
  }

  const todayPaise = summary ? (summary.todayPaise ?? summary.today ?? 0) : 0;
  const monthPaise = summary ? (summary.thisMonthPaise ?? summary.thisMonth ?? 0) : 0;
  const lifetimePaise = summary ? (summary.lifetimePaise ?? summary.lifetime ?? 0) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="mt-1 text-sm text-gray-500">Your developer earnings from ad impressions and clicks</p>
      </div>

      {summaryError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{summaryError}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Today</div>
          <div className="text-2xl font-bold text-gray-900">{summary ? formatINR(todayPaise) : '—'}</div>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">This Month</div>
          <div className="text-2xl font-bold text-gray-900">{summary ? formatINR(monthPaise) : '—'}</div>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Lifetime</div>
          <div className="text-2xl font-bold text-gray-900">{summary ? formatINR(lifetimePaise) : '—'}</div>
        </div>
      </div>

      {/* History table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-gray-900">Earnings History</h2>
        </div>
        {historyLoading ? (
          <div className="p-8 text-center text-gray-500">Loading history...</div>
        ) : historyError ? (
          <div className="p-8 text-center text-red-600">{historyError}</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No earnings yet.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(ev.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={ev.type} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatINR(ev.amountPaise ?? ev.amount ?? 0)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {ev.adTitle && <span>{ev.adTitle}</span>}
                      {ev.surface && <span className="ml-2 text-xs text-gray-400">{ev.surface}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
