'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiAuthGet, apiAuthPost } from '../../../../lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  budgetPaise: number;
  spentPaise: number;
  startDate: string | null;
  endDate: string | null;
}

interface Ad {
  id: string;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string | null;
  surface: string;
  status: string;
}

type Surface = 'spinner_overlay' | 'thinking_shimmer' | 'status_bar' | 'spinner_verb';

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toFixed(2);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-red-100 text-red-800',
    draft: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-700',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function SurfaceBadge({ surface }: { surface: string }) {
  const labels: Record<string, string> = {
    spinner_overlay: 'Spinner Overlay',
    thinking_shimmer: 'Thinking Shimmer',
    status_bar: 'Status Bar',
    spinner_verb: 'Spinner Verb',
  };
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
      {labels[surface] ?? surface}
    </span>
  );
}

function SurfacePreview({ surface, title, body, ctaText }: { surface: Surface; title: string; body: string; ctaText: string }) {
  if (!surface) return null;

  if (surface === 'spinner_overlay') {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 bg-gray-50 text-sm">
        <div className="font-semibold text-gray-800">{title || 'Ad Title'}</div>
        <div className="mt-1 text-gray-600 text-xs">{body || 'Ad description goes here'}</div>
        {ctaText && (
          <button className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white">{ctaText}</button>
        )}
      </div>
    );
  }

  if (surface === 'thinking_shimmer') {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 bg-gray-50 text-sm">
        <span className="text-gray-500 font-mono">⠋ Thinking... powered by <span className="font-semibold text-gray-800">{title || 'Ad Title'}</span></span>
      </div>
    );
  }

  if (surface === 'status_bar') {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 bg-gray-50 text-sm">
        <span className="font-mono text-xs text-gray-700">{title || 'Ad Title'} — {ctaText || 'Learn more'}</span>
      </div>
    );
  }

  if (surface === 'spinner_verb') {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 bg-gray-50 text-sm">
        <span className="text-gray-500 font-mono">Thinking... powered by <span className="font-semibold text-gray-800">{title || 'Ad Title'}</span></span>
      </div>
    );
  }

  return null;
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdForm, setShowAdForm] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adBody, setAdBody] = useState('');
  const [adCtaText, setAdCtaText] = useState('');
  const [adCtaUrl, setAdCtaUrl] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adSurface, setAdSurface] = useState<Surface | ''>('');
  const [creatingAd, setCreatingAd] = useState(false);
  const [adError, setAdError] = useState('');

  // Bid form shown after ad created
  const [newAdId, setNewAdId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidBlocks, setBidBlocks] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  useEffect(() => {
    loadAll();
  }, [campaignId]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [campData, adsData] = await Promise.all([
        apiAuthGet<{ campaign: Campaign } | Campaign>(`/campaigns/${campaignId}`),
        apiAuthGet<{ ads: Ad[] } | Ad[]>(`/campaigns/${campaignId}/ads`),
      ]);
      setCampaign((campData as { campaign: Campaign }).campaign ?? campData as Campaign);
      setAds((adsData as { ads: Ad[] }).ads ?? adsData as Ad[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAd(e: React.FormEvent) {
    e.preventDefault();
    setCreatingAd(true);
    setAdError('');
    try {
      const result = await apiAuthPost<{ ad: Ad } | Ad>(`/campaigns/${campaignId}/ads`, {
        title: adTitle,
        body: adBody,
        ctaText: adCtaText,
        ctaUrl: adCtaUrl,
        imageUrl: adImageUrl || null,
        surface: adSurface,
      });
      const created = (result as { ad: Ad }).ad ?? result as Ad;
      setNewAdId(created.id);
      setShowAdForm(false);
      await loadAll();
    } catch (e) {
      setAdError((e as Error).message);
    } finally {
      setCreatingAd(false);
    }
  }

  async function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    setPlacingBid(true);
    setBidError('');
    setBidSuccess('');
    try {
      await apiAuthPost('/auction/bid', {
        adId: newAdId,
        campaignId,
        surface: adSurface,
        bidAmount: Math.round(parseFloat(bidAmount) * 100),
        blocks: parseInt(bidBlocks, 10),
      });
      setBidSuccess('Bid placed successfully!');
      setNewAdId(null);
      setBidAmount('');
      setBidBlocks('');
    } catch (e) {
      setBidError((e as Error).message);
    } finally {
      setPlacingBid(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading campaign...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!campaign) {
    return <div className="text-gray-500">Campaign not found.</div>;
  }

  return (
    <div>
      {/* Campaign header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-gray-500">Campaign ID: {campaign.id}</p>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-500">Budget</div>
            <div className="font-semibold text-gray-900">{formatINR(campaign.budgetPaise)}</div>
            <div className="text-gray-400 mt-1">Spent: {formatINR(campaign.spentPaise)}</div>
          </div>
        </div>
        {(campaign.startDate || campaign.endDate) && (
          <div className="mt-3 flex gap-6 text-sm text-gray-500">
            {campaign.startDate && <span>Start: {new Date(campaign.startDate).toLocaleDateString('en-IN')}</span>}
            {campaign.endDate && <span>End: {new Date(campaign.endDate).toLocaleDateString('en-IN')}</span>}
          </div>
        )}
      </div>

      {/* Ads section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Ads</h2>
        <button
          onClick={() => { setShowAdForm(!showAdForm); setAdError(''); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showAdForm ? 'Cancel' : 'Create Ad'}
        </button>
      </div>

      {bidSuccess && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {bidSuccess}
        </div>
      )}

      {/* Create Ad form */}
      {showAdForm && (
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <h3 className="text-base font-semibold mb-4">New Ad</h3>
          <form onSubmit={handleCreateAd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                required
                type="text"
                value={adTitle}
                onChange={e => setAdTitle(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Sponsored by Acme"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                required
                value={adBody}
                onChange={e => setAdBody(e.target.value)}
                rows={2}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Short description of your ad"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                <input
                  required
                  type="text"
                  value={adCtaText}
                  onChange={e => setAdCtaText(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Learn more"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                <input
                  required
                  type="url"
                  value={adCtaUrl}
                  onChange={e => setAdCtaUrl(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
              <input
                type="url"
                value={adImageUrl}
                onChange={e => setAdImageUrl(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="https://example.com/image.png"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surface</label>
              <select
                required
                value={adSurface}
                onChange={e => setAdSurface(e.target.value as Surface)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a surface</option>
                <option value="spinner_overlay">Spinner Overlay</option>
                <option value="thinking_shimmer">Thinking Shimmer</option>
                <option value="status_bar">Status Bar</option>
                <option value="spinner_verb">Spinner Verb</option>
              </select>
            </div>

            {adSurface && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                <SurfacePreview
                  surface={adSurface as Surface}
                  title={adTitle}
                  body={adBody}
                  ctaText={adCtaText}
                />
              </div>
            )}

            {adError && <p className="text-sm text-red-600">{adError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creatingAd}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingAd ? 'Creating...' : 'Create Ad'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdForm(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Place bid form (shown after ad is created) */}
      {newAdId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm mb-6">
          <h3 className="text-base font-semibold text-blue-900 mb-1">Place a Bid</h3>
          <p className="text-sm text-blue-700 mb-4">Ad created. Place a bid to get it shown to users.</p>
          <form onSubmit={handlePlaceBid} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bid Amount (INR per 1000 impressions)</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="15.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blocks count</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={bidBlocks}
                  onChange={e => setBidBlocks(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="100"
                />
              </div>
            </div>
            {bidError && <p className="text-sm text-red-600">{bidError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={placingBid}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {placingBid ? 'Placing...' : 'Place Bid'}
              </button>
              <button
                type="button"
                onClick={() => setNewAdId(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Skip
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ads list */}
      {ads.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500 shadow-sm">
          No ads yet. Create your first ad above.
        </div>
      ) : (
        <div className="grid gap-4">
          {ads.map(ad => (
            <div key={ad.id} className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{ad.title}</h3>
                    <StatusBadge status={ad.status} />
                    <SurfaceBadge surface={ad.surface} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{ad.body}</p>
                  <a
                    href={ad.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:underline"
                  >
                    {ad.ctaText} →
                  </a>
                </div>
                {ad.imageUrl && (
                  <img src={ad.imageUrl} alt={ad.title} className="ml-4 h-16 w-16 rounded object-cover" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
