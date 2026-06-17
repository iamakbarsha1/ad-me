import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { payoutRequestSchema, payoutSettingsSchema } from '@ad-me/shared';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  // TODO: List payout history
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/request', validate(payoutRequestSchema), async (req, res) => {
  // TODO: Request payout (check min threshold, create payout record)
  res.status(501).json({ error: 'Not implemented' });
});

router.put('/settings', validate(payoutSettingsSchema), async (req, res) => {
  // TODO: Update payout settings (UPI/bank)
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
