export type UserRole = 'developer' | 'advertiser' | 'admin';
export type AdSurface = 'spinner_overlay' | 'thinking_shimmer' | 'status_bar' | 'spinner_verb';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type AdStatus = 'pending' | 'approved' | 'rejected' | 'active';
export type AdBlockStatus = 'active' | 'exhausted' | 'cancelled';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutMethod = 'upi' | 'bank_transfer';
export type EarningType = 'impression' | 'click';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  payoutDetails: UpiPayoutDetails | BankPayoutDetails | null;
  lifetimeEarned: number; // paise
  createdAt: Date;
  updatedAt: Date;
}

export interface UpiPayoutDetails {
  method: 'upi';
  upiId: string;
}

export interface BankPayoutDetails {
  method: 'bank_transfer';
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

export interface Advertiser {
  id: string;
  userId: string;
  companyName: string;
  gstin: string | null;
  balance: number; // paise
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  status: CampaignStatus;
  budget: number; // paise
  spent: number; // paise
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ad {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string | null;
  status: AdStatus;
  surface: AdSurface;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdBlock {
  id: string;
  campaignId: string;
  adId: string;
  surface: AdSurface;
  bidAmount: number; // paise per 1000 impressions
  impressionsTotal: number;
  impressionsServed: number;
  status: AdBlockStatus;
  createdAt: Date;
}

export interface Impression {
  id: string;
  adId: string;
  userId: string;
  adBlockId: string;
  idempotencyKey: string;
  surface: AdSurface;
  qualified: boolean;
  durationMs: number;
  ipAddress: string | null;
  createdAt: Date;
}

export interface Click {
  id: string;
  impressionId: string;
  userId: string;
  adId: string;
  idempotencyKey: string;
  ipAddress: string | null;
  createdAt: Date;
}

export interface Earning {
  id: string;
  userId: string;
  impressionId: string | null;
  clickId: string | null;
  amount: number; // paise
  type: EarningType;
  createdAt: Date;
}

export interface Payout {
  id: string;
  userId: string;
  amount: number; // paise
  status: PayoutStatus;
  payoutMethod: PayoutMethod;
  payoutDetails: UpiPayoutDetails | BankPayoutDetails;
  dodopayoutId: string | null;
  requestedAt: Date;
  completedAt: Date | null;
}

export interface AdServeResponse {
  ad: {
    id: string;
    title: string;
    body: string;
    ctaText: string;
    ctaUrl: string;
    imageUrl: string | null;
    surface: AdSurface;
  };
  blockId: string;
}

export interface KillswitchStatus {
  enabled: boolean;
  reason: string | null;
}

export interface EarningsSummary {
  today: number;
  thisMonth: number;
  lifetime: number;
}

export interface AdminStats {
  totalUsers: number;
  totalAdvertisers: number;
  totalCampaigns: number;
  totalAds: number;
  totalImpressions: number;
  totalClicks: number;
  totalEarningsPaise: number;
  totalAdvertiserBalancePaise: number;
}

export interface AdminCampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  budget: number;
  spent: number;
  advertiserName: string;
  advertiserEmail: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  earnedPaise: number;
}
