import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['developer', 'advertiser', 'admin']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const adStatusEnum = pgEnum('ad_status', ['pending', 'approved', 'rejected', 'active']);
export const adSurfaceEnum = pgEnum('ad_surface', ['spinner_overlay', 'thinking_shimmer', 'status_bar', 'spinner_verb']);
export const adBlockStatusEnum = pgEnum('ad_block_status', ['active', 'exhausted', 'cancelled']);
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed']);
export const payoutMethodEnum = pgEnum('payout_method', ['upi', 'bank_transfer']);
export const earningTypeEnum = pgEnum('earning_type', ['impression', 'click']);
export const leaderboardPeriodEnum = pgEnum('leaderboard_period', ['daily', 'weekly', 'monthly', 'alltime']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('developer'),
  payoutDetails: jsonb('payout_details'),
  lifetimeEarned: integer('lifetime_earned').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const advertisers = pgTable('advertisers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  companyName: text('company_name').notNull(),
  gstin: text('gstin'),
  balance: integer('balance').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  advertiserId: uuid('advertiser_id').notNull().references(() => advertisers.id),
  name: text('name').notNull(),
  status: campaignStatusEnum('status').notNull().default('draft'),
  budget: integer('budget').notNull(),
  spent: integer('spent').notNull().default(0),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('campaigns_advertiser_id_idx').on(table.advertiserId),
]);

export const ads = pgTable('ads', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  ctaText: text('cta_text').notNull(),
  ctaUrl: text('cta_url').notNull(),
  imageUrl: text('image_url'),
  status: adStatusEnum('status').notNull().default('pending'),
  surface: adSurfaceEnum('surface').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ads_campaign_id_idx').on(table.campaignId),
]);

export const adBlocks = pgTable('ad_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  adId: uuid('ad_id').notNull().references(() => ads.id),
  surface: adSurfaceEnum('surface').notNull(),
  bidAmount: integer('bid_amount').notNull(),
  impressionsTotal: integer('impressions_total').notNull().default(1000),
  impressionsServed: integer('impressions_served').notNull().default(0),
  status: adBlockStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ad_blocks_surface_status_idx').on(table.surface, table.status),
]);

export const impressions = pgTable('impressions', (t) => ({
  id: t.uuid('id').primaryKey().defaultRandom(),
  adId: t.uuid('ad_id').notNull().references(() => ads.id),
  userId: t.uuid('user_id').notNull().references(() => users.id),
  adBlockId: t.uuid('ad_block_id').notNull().references(() => adBlocks.id),
  idempotencyKey: t.text('idempotency_key').notNull(),
  surface: adSurfaceEnum('surface').notNull(),
  qualified: t.boolean('qualified').notNull().default(false),
  durationMs: t.integer('duration_ms').notNull(),
  ipAddress: t.text('ip_address'),
  createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}), (table) => [
  uniqueIndex('impressions_idempotency_key_idx').on(table.idempotencyKey),
  index('impressions_ad_block_id_idx').on(table.adBlockId),
]);

export const clicks = pgTable('clicks', (t) => ({
  id: t.uuid('id').primaryKey().defaultRandom(),
  impressionId: t.uuid('impression_id').notNull().references(() => impressions.id),
  userId: t.uuid('user_id').notNull().references(() => users.id),
  adId: t.uuid('ad_id').notNull().references(() => ads.id),
  idempotencyKey: t.text('idempotency_key').notNull(),
  ipAddress: t.text('ip_address'),
  createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}), (table) => [
  uniqueIndex('clicks_idempotency_key_idx').on(table.idempotencyKey),
]);

export const earnings = pgTable('earnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  impressionId: uuid('impression_id').references(() => impressions.id),
  clickId: uuid('click_id').references(() => clicks.id),
  amount: integer('amount').notNull(),
  type: earningTypeEnum('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('earnings_user_id_idx').on(table.userId),
]);

export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  status: payoutStatusEnum('status').notNull().default('pending'),
  payoutMethod: payoutMethodEnum('payout_method').notNull(),
  payoutDetails: jsonb('payout_details').notNull(),
  dodoPayoutId: text('dodo_payout_id'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('payouts_user_id_idx').on(table.userId),
]);

export const killswitch = pgTable('killswitch', {
  id: uuid('id').primaryKey().defaultRandom(),
  enabled: boolean('enabled').notNull().default(false),
  reason: text('reason'),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leaderboardCache = pgTable('leaderboard_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  period: leaderboardPeriodEnum('period').notNull(),
  earned: integer('earned').notNull().default(0),
  rank: integer('rank').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});
