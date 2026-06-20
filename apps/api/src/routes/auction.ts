import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { validate } from '../middleware/validate.js';
import { auctionBidSchema, FLOOR_PRICES } from '@ad-me/shared';
import { authMiddleware, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { advertisers, adBlocks } from '../db/schema.js';

const router = Router();

router.use(authMiddleware, requireRole('advertiser', 'admin'));

router.post('/bid', validate(auctionBidSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { campaignId, adId, surface, bidAmount, blocks } = req.body as {
      campaignId: string;
      adId: string;
      surface: keyof typeof FLOOR_PRICES;
      bidAmount: number;
      blocks: number;
    };

    // Validate floor price
    const floorPrice = FLOOR_PRICES[surface];
    if (bidAmount < floorPrice) {
      res.status(400).json({
        error: `Bid amount ${bidAmount} is below floor price ${floorPrice} for surface ${surface}`,
      });
      return;
    }

    const totalCost = bidAmount * blocks;

    const createdBlocks = await db.transaction(async (tx) => {
      // SEC-01: Balance check inside transaction with row-level lock
      const [advertiser] = await tx
        .select({ id: advertisers.id, balance: advertisers.balance })
        .from(advertisers)
        .where(eq(advertisers.userId, authReq.userId!))
        .for('update')
        .limit(1);

      if (!advertiser) {
        throw new Error('ADVERTISER_NOT_FOUND');
      }

      if (advertiser.balance < totalCost) {
        throw new Error(`INSUFFICIENT_BALANCE:${totalCost}:${advertiser.balance}`);
      }

      // Deduct balance
      await tx
        .update(advertisers)
        .set({ balance: sql`${advertisers.balance} - ${totalCost}`, updatedAt: new Date() })
        .where(eq(advertisers.id, advertiser.id));

      // Create ad blocks
      const blockValues = Array.from({ length: blocks }, () => ({
        campaignId,
        adId,
        surface,
        bidAmount,
      }));

      return tx.insert(adBlocks).values(blockValues).returning();
    });

    res.status(201).json({
      adBlocks: createdBlocks,
      totalCost,
      blocksCreated: createdBlocks.length,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'ADVERTISER_NOT_FOUND') {
        res.status(404).json({ error: 'Advertiser profile not found' });
        return;
      }
      if (err.message.startsWith('INSUFFICIENT_BALANCE:')) {
        const [, required, available] = err.message.split(':');
        res.status(400).json({
          error: `Insufficient balance. Required: ${required} paise, Available: ${available} paise`,
        });
        return;
      }
    }
    console.error('POST /auction/bid error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/floor', async (_req, res) => {
  res.json({ floors: FLOOR_PRICES });
});

export default router;
