'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiAuthGet, apiAuthPost, apiAuthPatch } from '../../../lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  budgetPaise: number;
  spentPaise: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toFixed(2);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-red-100 text-red-800',
    draft: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createBudget, setCreateBudget] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');

  // Edit state: campaignId -> fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    setError('');
    try {
      const data = await apiAuthGet<{ campaigns: Campaign[] }>('/campaigns');
      setCampaigns(data.campaigns ?? (data as unknown as Campaign[]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await apiAuthPost('/campaigns', {
        name: createName,
        budget: Math.round(parseFloat(createBudget) * 100),
        ...(createStartDate ? { startDate: new Date(createStartDate).toISOString() } : {}),
        ...(createEndDate ? { endDate: new Date(createEndDate).toISOString() } : {}),
      });
      setShowCreate(false);
      setCreateName('');
      setCreateBudget('');
      setCreateStartDate('');
      setCreateEndDate('');
      await loadCampaigns();
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleTogglePause(campaign: Campaign) {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await apiAuthPatch(`/campaigns/${campaign.id}`, { status: newStatus });
      await loadCampaigns();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign?')) return;
    try {
      await apiAuthPatch(`/campaigns/${id}`, { status: 'completed' });
      await loadCampaigns();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(campaign: Campaign) {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditBudget((campaign.budgetPaise / 100).toFixed(2));
  }

  async function handleEditSave(id: string) {
    try {
      await apiAuthPatch(`/campaigns/${id}`, {
        name: editName,
        budget: Math.round(parseFloat(editBudget) * 100),
      });
      setEditingId(null);
      await loadCampaigns();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your ad campaigns</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Create Campaign'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold mb-4">New Campaign</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name</label>
              <input
                required
                type="text"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="My Campaign"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget (INR)</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={createBudget}
                onChange={e => setCreateBudget(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="500.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={createStartDate}
                  onChange={e => setCreateStartDate(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={createEndDate}
                  onChange={e => setCreateEndDate(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No campaigns yet. Create your first campaign above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Budget</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Spent</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-40 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <button
                        onClick={() => router.push(`/campaigns/${c.id}`)}
                        className="font-medium text-blue-600 hover:underline text-left"
                      >
                        {c.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={editBudget}
                        onChange={e => setEditBudget(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-28 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      formatINR(c.budgetPaise)
                    )}
                  </td>
                  <td className="px-4 py-3">{formatINR(c.spentPaise)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingId === c.id ? (
                        <>
                          <button
                            onClick={() => handleEditSave(c.id)}
                            className="rounded border border-blue-600 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(c)}
                            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleTogglePause(c)}
                            className={`rounded border px-2 py-1 text-xs ${c.status === 'active' ? 'border-yellow-400 text-yellow-700 hover:bg-yellow-50' : 'border-green-500 text-green-700 hover:bg-green-50'}`}
                          >
                            {c.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="rounded border border-red-400 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
