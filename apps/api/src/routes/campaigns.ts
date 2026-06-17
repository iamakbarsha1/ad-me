import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema, updateCampaignSchema } from '@ad-me/shared';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole('advertiser', 'admin'));

router.get('/', async (req, res) => {
  // TODO: List campaigns for advertiser
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/:id', async (req, res) => {
  // TODO: Get campaign by ID
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/', validate(createCampaignSchema), async (req, res) => {
  // TODO: Create campaign
  res.status(501).json({ error: 'Not implemented' });
});

router.patch('/:id', validate(updateCampaignSchema), async (req, res) => {
  // TODO: Update campaign
  res.status(501).json({ error: 'Not implemented' });
});

router.delete('/:id', async (req, res) => {
  // TODO: Delete campaign (soft delete or archive)
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
