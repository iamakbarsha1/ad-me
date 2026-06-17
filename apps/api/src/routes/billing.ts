import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { validate } from '../middleware/validate.js';
import { depositSchema } from '@ad-me/shared';
import { authMiddleware, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { advertisers, adBlocks, campaigns } from '../db/schema.js';

async function createDodoCheckout(advertiserId: string, amountPaise: number) {
  const apiKey = process.env.DODO_API_KEY;

  if (!apiKey) {
    // Mock mode for development
    return {
      checkoutUrl: `https://checkout.dodopayments.com/mock?advertiserId=${advertiserId}&amount=${amountPaise}&currency=INR`,
      amount: amountPaise,
      advertiserId,
      mock: true,
    };
  }

  const response = await fetch('https://api.dodopayments.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      metadata: { advertiserId },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[dodo] checkout creation failed:', err);
    throw new Error('Payment checkout creation failed');
  }

  const data = await response.json() as { checkout_url: string; id: string };

  return {
    checkoutUrl: data.checkout_url,
    paymentId: data.id,
    amount: amountPaise,
    advertiserId,
    mock: false,
  };
}

const router = Router();

router.use(authMiddleware, requireRole('advertiser', 'admin'));

router.post('/deposit', validate(depositSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { amount } = req.body as { amount: number };

    const [advertiser] = await db
      .select({ id: advertisers.id, balance: advertisers.balance })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const checkoutResult = await createDodoCheckout(advertiser.id, amount);

    res.status(201).json(checkoutResult);
  } catch (err) {
    console.error('POST /billing/deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/balance', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id, balance: advertisers.balance, createdAt: advertisers.createdAt })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    // Recent debits: ad_blocks created under this advertiser's campaigns
    const transactions = await db
      .select({
        id: adBlocks.id,
        campaignId: adBlocks.campaignId,
        adId: adBlocks.adId,
        surface: adBlocks.surface,
        amount: adBlocks.bidAmount,
        status: adBlocks.status,
        createdAt: adBlocks.createdAt,
      })
      .from(adBlocks)
      .innerJoin(campaigns, eq(campaigns.id, adBlocks.campaignId))
      .where(eq(campaigns.advertiserId, advertiser.id))
      .orderBy(desc(adBlocks.createdAt))
      .limit(20);

    res.json({
      balance: advertiser.balance,
      recentTransactions: transactions.map((t) => ({
        id: t.id,
        type: 'debit',
        description: `Ad block purchased (${t.surface})`,
        amount: t.amount,
        campaignId: t.campaignId,
        adId: t.adId,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error('GET /billing/balance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
