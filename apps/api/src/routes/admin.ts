import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

router.get('/stats', async (req, res) => {
  // TODO: Return admin stats
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
