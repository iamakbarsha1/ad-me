'use client';

import { useState, useEffect } from 'react';
import { apiAuthGet, apiAuthPost } from '../../../lib/api';

interface BalanceData {
  balancePaise?: number;
  balance?: number;
}

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toFixed(2);
}

export default function BillingPage() {
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState('');

  const [amount, setAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  useEffect(() => {
    loadBalance();
  }, []);

  async function loadBalance() {
    setLoadingBalance(true);
    setBalanceError('');
    try {
      const data = await apiAuthGet<BalanceData>('/billing/balance');
      setBalancePaise(data.balancePaise ?? data.balance ?? 0);
    } catch (e) {
      setBalanceError((e as Error).message);
    } finally {
      setLoadingBalance(false);
    }
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    setDepositing(true);
    setDepositError('');
    setDepositSuccess('');
    try {
      await apiAuthPost('/billing/deposit', {
        amountPaise: Math.round(parseFloat(amount) * 100),
      });
      setDepositSuccess('Deposit initiated successfully!');
      setAmount('');
      await loadBalance();
    } catch (e) {
      setDepositError((e as Error).message);
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your ad spend balance</p>
      </div>

      {/* Balance card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
        <div className="text-sm font-medium text-gray-500 mb-1">Available Balance</div>
        {loadingBalance ? (
          <div className="text-gray-400 text-lg">Loading...</div>
        ) : balanceError ? (
          <div className="text-red-600 text-sm">{balanceError}</div>
        ) : (
          <div className="text-3xl font-bold text-gray-900">
            {balancePaise !== null ? formatINR(balancePaise) : '—'}
          </div>
        )}
      </div>

      {/* Add funds form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add Funds</h2>
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="500.00"
            />
          </div>

          {depositError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {depositError}
            </div>
          )}
          {depositSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {depositSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={depositing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {depositing ? 'Processing...' : 'Add Funds'}
          </button>
        </form>
      </div>
    </div>
  );
}
