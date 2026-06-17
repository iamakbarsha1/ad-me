'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  earnedPaise: number;
}

const PERIODS = ['daily', 'weekly', 'monthly', 'alltime'] as const;
const PERIOD_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  alltime: 'All Time',
};

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Leaderboard is public — no auth needed, but apiGet requires a token param.
      // Pass empty string since this endpoint has no auth.
      const data = await apiGet<{ period: string; entries: LeaderboardEntry[] }>(`/leaderboard?period=${period}`, '');
      setEntries(data.entries);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600 mb-4">Error: {error}</div>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">No earnings data for this period yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4 w-16">Rank</th>
              <th className="py-2 pr-4">Developer</th>
              <th className="py-2 text-right">Earned</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.userId}
                className={`border-b ${user?.id === e.userId ? 'bg-indigo-50 font-medium' : ''}`}
              >
                <td className="py-2 pr-4">
                  {e.rank <= 3 ? (
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                      e.rank === 1 ? 'bg-yellow-500' : e.rank === 2 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>{e.rank}</span>
                  ) : e.rank}
                </td>
                <td className="py-2 pr-4 flex items-center gap-2">
                  {e.avatarUrl ? (
                    <img src={e.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-200" />
                  )}
                  {e.name}
                  {user?.id === e.userId && <span className="text-xs text-indigo-600">(you)</span>}
                </td>
                <td className="py-2 text-right font-mono">{formatINR(e.earnedPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
