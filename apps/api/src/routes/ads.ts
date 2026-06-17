import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { adNextQuerySchema } from '@ad-me/shared';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/next', authMiddleware, validate(adNextQuerySchema, 'query'), async (req, res) => {
  // TODO: Return highest-ranked active ad for surface
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
