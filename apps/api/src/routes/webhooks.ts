import { Router } from 'express';

const router = Router();

router.post('/dodo', async (req, res) => {
  // TODO: Verify Dodo webhook signature
  // TODO: Handle payment.completed → credit advertiser balance
  // TODO: Handle payout.completed → mark payout complete
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
