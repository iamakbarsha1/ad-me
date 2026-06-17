import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  // TODO: Return today/month/lifetime earnings
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/history', async (req, res) => {
  // TODO: Paginated earnings history
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
