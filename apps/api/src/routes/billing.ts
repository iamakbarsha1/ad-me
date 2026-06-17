import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { depositSchema } from '@ad-me/shared';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole('advertiser', 'admin'));

router.post('/deposit', validate(depositSchema), async (req, res) => {
  // TODO: Create Dodo checkout session, return checkout URL
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/balance', async (req, res) => {
  // TODO: Return advertiser balance
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
