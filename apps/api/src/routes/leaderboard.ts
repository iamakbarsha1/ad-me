import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  // TODO: Return leaderboard from cache table
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
