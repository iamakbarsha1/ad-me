export const AD_SURFACES = ['spinner_overlay', 'thinking_shimmer', 'status_bar', 'spinner_verb'] as const;

// Floor prices in paise per block of 1000 impressions
export const FLOOR_PRICES = {
  spinner_overlay: 1500,
  thinking_shimmer: 1000,
  status_bar: 700,
  spinner_verb: 500,
} as const;

export const REVENUE_SPLIT = 0.5; // 50% to developer
export const CLICK_MULTIPLIER = 50; // click = 50x impression rate
export const IMPRESSIONS_PER_BLOCK = 1000;
export const QUALIFIED_IMPRESSION_MS = 5000; // 5 seconds

export const MIN_PAYOUT_PAISE = 500; // INR 5
export const MANUAL_REVIEW_THRESHOLD_PAISE = 1_000_000; // INR 10,000

export const JWT_ACCESS_TTL = '15m';
export const JWT_REFRESH_TTL = '30d';
export const JWT_ACCESS_TTL_MS = 15 * 60 * 1000;
export const JWT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const RATE_LIMITS = {
  impressionsPerHour: 60,
  clicksPerHour: 10,
} as const;

export const KILLSWITCH_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
