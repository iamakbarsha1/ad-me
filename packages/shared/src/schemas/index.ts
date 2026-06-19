import { z } from 'zod';
import { AD_SURFACES } from '../constants/index.js';

export const googleAuthSchema = z.object({
  token: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const adSurfaceSchema = z.enum(AD_SURFACES);

export const adNextQuerySchema = z.object({
  surface: adSurfaceSchema,
  region: z.string().default('IN'),
});

export const impressionSchema = z.object({
  adId: z.string().uuid(),
  blockId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(128),
  surface: adSurfaceSchema,
  durationMs: z.number().int().positive(),
});

export const clickSchema = z.object({
  impressionId: z.string().uuid(),
  adId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(128),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  budget: z.number().int().positive(), // paise
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'paused']).optional(),
  budget: z.number().int().positive().optional(),
  endDate: z.string().datetime().optional(),
});

export const createAdSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  ctaText: z.string().min(1).max(50),
  ctaUrl: z.string().url(),
  imageUrl: z.string().url().optional(),
  surface: adSurfaceSchema,
});

export const auctionBidSchema = z.object({
  campaignId: z.string().uuid(),
  adId: z.string().uuid(),
  surface: adSurfaceSchema,
  bidAmount: z.number().int().positive(), // paise per 1000 impressions
  blocks: z.number().int().positive().max(100),
});

export const payoutSettingsSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('upi'),
    upiId: z.string().min(1).regex(/^[\w.-]+@[\w]+$/),
  }),
  z.object({
    method: z.literal('bank_transfer'),
    accountNumber: z.string().min(1),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    accountHolderName: z.string().min(1),
  }),
]);

export const payoutRequestSchema = z.object({
  amount: z.number().int().positive().optional(), // if omitted, payout all available
});

export const depositSchema = z.object({
  amount: z.number().int().positive(), // paise
});

export const adminUpdateCampaignSchema = z.object({
  status: z.enum(['active', 'paused', 'completed']),
});

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(['developer', 'advertiser', 'admin']),
});

export const leaderboardQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'alltime']).default('weekly'),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
