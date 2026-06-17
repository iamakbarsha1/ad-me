'use client';

import { useState, useEffect } from 'react';
import { apiAuthGet, apiAuthPost, apiAuthPut } from '../../../lib/api';

interface Payout {
  id: string;
  amountPaise?: number;
  amount?: number;
  status: string;
  method: string;
  requestedAt?: string;
  createdAt?: string;
  completedAt: string | null;
}

interface PayoutsResponse {
  payouts?: Payout[];
  data?: Payout[];
}

interface EarningsSummary {
  lifetimePaise?: number;
  lifetime?: number;
}

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toFixed(2);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState('');

  const [lifetimePaise, setLifetimePaise] = useState<number>(0);

  // Request payout
  const [requestAmount, setRequestAmount] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  // Payout settings
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  useEffect(() => {
    loadPayouts();
    loadSummary();
  }, []);

  async function loadPayouts() {
    setPayoutsLoading(true);
    setPayoutsError('');
    try {
      const data = await apiAuthGet<PayoutsResponse | Payout[]>('/payouts');
      const list = (data as PayoutsResponse).payouts ?? (data as PayoutsResponse).data ?? (data as Payout[]);
      setPayouts(list);
    } catch (e) {
      setPayoutsError((e as Error).message);
    } finally {
      setPayoutsLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const data = await apiAuthGet<EarningsSummary>('/earnings/summary');
      setLifetimePaise(data.lifetimePaise ?? data.lifetime ?? 0);
    } catch {
      // non-critical
    }
  }

  // Available = lifetime - sum of pending/processing/completed payouts
  const paidOrPendingPaise = payouts
    .filter(p => ['pending', 'processing', 'completed'].includes(p.status))
    .reduce((sum, p) => sum + (p.amountPaise ?? p.amount ?? 0), 0);
  const availablePaise = Math.max(0, lifetimePaise - paidOrPendingPaise);

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true);
    setRequestError('');
    setRequestSuccess('');
    try {
      await apiAuthPost('/payouts', {
        amountPaise: Math.round(parseFloat(requestAmount) * 100),
      });
      setRequestSuccess('Payout requested successfully!');
      setRequestAmount('');
      await loadPayouts();
    } catch (e) {
      setRequestError((e as Error).message);
    } finally {
      setRequesting(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const body: Record<string, unknown> = { method: payoutMethod };
      if (payoutMethod === 'upi') {
        body.upiId = upiId;
      } else {
        body.accountNumber = accountNumber;
        body.ifscCode = ifscCode;
        body.accountHolderName = accountHolderName;
      }
      await apiAuthPut('/payouts/settings', body);
      setSettingsSuccess('Settings saved!');
    } catch (e) {
      setSettingsError((e as Error).message);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="mt-1 text-sm text-gray-500">Request payouts and manage your payout settings</p>
      </div>

      {/* Payout history */}
      <div className="rounded-lg border bg-white shadow-sm mb-6">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-gray-900">Payout History</h2>
        </div>
        {payoutsLoading ? (
          <div className="p-8 text-center text-gray-500">Loading payouts...</div>
        ) : payoutsError ? (
          <div className="p-8 text-center text-red-600">{payoutsError}</div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payouts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Requested</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{formatINR(p.amountPaise ?? p.amount ?? 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.method}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.requestedAt || p.createdAt
                      ? new Date(p.requestedAt ?? p.createdAt ?? '').toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.completedAt ? new Date(p.completedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Request payout */}
      <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Request Payout</h2>
        <p className="text-sm text-gray-500 mb-4">
          Available balance: <span className="font-medium text-gray-900">{formatINR(availablePaise)}</span>
          <span className="ml-2 text-xs text-gray-400">(Minimum ₹5.00)</span>
        </p>
        <form onSubmit={handleRequestPayout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
            <input
              required
              type="number"
              min="5"
              step="0.01"
              value={requestAmount}
              onChange={e => setRequestAmount(e.target.value)}
              className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="100.00"
            />
          </div>
          {requestError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{requestError}</div>
          )}
          {requestSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{requestSuccess}</div>
          )}
          <button
            type="submit"
            disabled={requesting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {requesting ? 'Requesting...' : 'Request Payout'}
          </button>
        </form>
      </div>

      {/* Payout settings */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Payout Settings</h2>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payout Method</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMethod"
                  value="upi"
                  checked={payoutMethod === 'upi'}
                  onChange={() => setPayoutMethod('upi')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">UPI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payoutMethod"
                  value="bank"
                  checked={payoutMethod === 'bank'}
                  onChange={() => setPayoutMethod('bank')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Bank Transfer</span>
              </label>
            </div>
          </div>

          {payoutMethod === 'upi' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
              <input
                required
                type="text"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                className="block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="yourname@upi"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                <input
                  required
                  type="text"
                  value={accountHolderName}
                  onChange={e => setAccountHolderName(e.target.value)}
                  className="block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  required
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input
                  required
                  type="text"
                  value={ifscCode}
                  onChange={e => setIfscCode(e.target.value)}
                  className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="SBIN0001234"
                />
              </div>
            </div>
          )}

          {settingsError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{settingsError}</div>
          )}
          {settingsSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{settingsSuccess}</div>
          )}

          <button
            type="submit"
            disabled={savingSettings}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
