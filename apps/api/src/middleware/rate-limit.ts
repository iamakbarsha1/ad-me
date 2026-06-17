import rateLimit from 'express-rate-limit';

export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const impressionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: { error: 'Impression rate limit exceeded' },
});

export const clickLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: { error: 'Click rate limit exceeded' },
});
