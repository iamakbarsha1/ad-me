import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { adNextQuerySchema } from '@ad-me/shared';
import { authMiddleware } from '../middleware/auth.js';
import { getNextAd } from '../services/ad-serving.js';
import type { AdSurface } from '@ad-me/shared';

const router = Router();

router.get('/next', authMiddleware, validate(adNextQuerySchema, 'query'), async (req, res) => {
  const { surface } = req.query as { surface: string };
  const result = await getNextAd(surface as AdSurface);

  if (!result) {
    res.status(204).end();
    return;
  }

  res.json(result);
});

export default router;
