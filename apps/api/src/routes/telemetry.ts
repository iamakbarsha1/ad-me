import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { impressionSchema, clickSchema } from '@ad-me/shared';
import { authMiddleware } from '../middleware/auth.js';
import { impressionLimiter, clickLimiter } from '../middleware/rate-limit.js';

const router = Router();

router.post('/impression', authMiddleware, impressionLimiter, validate(impressionSchema), async (req, res) => {
  // TODO: Record qualified impression, create earning (50/50 split), deduct block
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/click', authMiddleware, clickLimiter, validate(clickSchema), async (req, res) => {
  // TODO: Record click, create earning (50x impression rate, 50/50 split)
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
