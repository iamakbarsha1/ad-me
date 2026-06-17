import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { advertisers, payouts } from '../db/schema.js';

const router = Router();

router.post('/dodo', async (req, res) => {
  try {
    // TODO: Verify Dodo Payments webhook signature before processing.
    // Steps:
    //   1. Retrieve the raw request body (needs express.raw() middleware for this route)
    //   2. Compute HMAC-SHA256 of raw body using DODO_WEBHOOK_SECRET
    //   3. Compare with the signature in req.headers['x-dodo-signature']
    //   4. Return 401 if signature mismatch
    // For now, signature verification is skipped (development mode).

    const event = req.body as { type?: string; data?: Record<string, unknown> };

    if (!event.type || !event.data) {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    switch (event.type) {
      case 'payment.completed': {
        // Credit advertiser balance on successful deposit
        const { advertiserId, amount } = event.data as { advertiserId: string; amount: number };

        if (!advertiserId || typeof amount !== 'number') {
          res.status(400).json({ error: 'Missing advertiserId or amount in payment.completed event' });
          return;
        }

        await db
          .update(advertisers)
          .set({
            balance: sql`${advertisers.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(advertisers.id, advertiserId));

        console.log(`[webhook] payment.completed: credited ${amount} paise to advertiser ${advertiserId}`);
        break;
      }

      case 'payout.completed': {
        // Mark payout record as completed
        const { payoutId, dodoPayoutId } = event.data as { payoutId: string; dodoPayoutId?: string };

        if (!payoutId) {
          res.status(400).json({ error: 'Missing payoutId in payout.completed event' });
          return;
        }

        await db
          .update(payouts)
          .set({
            status: 'completed',
            completedAt: new Date(),
            ...(dodoPayoutId ? { dodoPayoutId } : {}),
          })
          .where(eq(payouts.id, payoutId));

        console.log(`[webhook] payout.completed: payout ${payoutId} marked complete`);
        break;
      }

      default:
        // Unknown event type — acknowledge receipt without processing
        console.log(`[webhook] unhandled event type: ${event.type}`);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('POST /webhooks/dodo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
