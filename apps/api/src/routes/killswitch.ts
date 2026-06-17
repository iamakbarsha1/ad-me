import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  // TODO: Return killswitch status from DB
  res.json({ enabled: false, reason: null });
});

export default router;
