import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { auctionBidSchema } from '@ad-me/shared';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole('advertiser', 'admin'));

router.post('/bid', validate(auctionBidSchema), async (req, res) => {
  // TODO: Place bid, validate floor price, deduct balance, create ad_blocks
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/floor', async (req, res) => {
  // TODO: Return floor prices per surface
  const { FLOOR_PRICES } = await import('@ad-me/shared');
  res.json({ floors: FLOOR_PRICES });
});

export default router;
