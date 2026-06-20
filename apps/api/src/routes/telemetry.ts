import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from '../middleware/validate.js';
import { impressionSchema, clickSchema, QUALIFIED_IMPRESSION_MS, IMPRESSIONS_PER_BLOCK, REVENUE_SPLIT, CLICK_MULTIPLIER } from '@ad-me/shared';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js';
import { impressionLimiter, clickLimiter } from '../middleware/rate-limit.js';
import { db } from '../db/index.js';
import { impressions, clicks, earnings, adBlocks, ads, campaigns, users } from '../db/schema.js';

const router = Router();

router.post('/impression', authMiddleware, impressionLimiter, validate(impressionSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { adId, blockId, idempotencyKey, surface, durationMs } = req.body;

  // Idempotency: check if impression with this key already exists
  const existing = await db
    .select({ id: impressions.id, qualified: impressions.qualified })
    .from(impressions)
    .where(eq(impressions.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    res.json({ id: existing[0].id, qualified: existing[0].qualified });
    return;
  }

  const qualified = durationMs >= QUALIFIED_IMPRESSION_MS;

  // Insert impression
  const [impression] = await db
    .insert(impressions)
    .values({
      adId,
      userId: authReq.userId!,
      adBlockId: blockId,
      idempotencyKey,
      surface,
      qualified,
      durationMs,
      ipAddress: req.ip ?? null,
    })
    .returning({ id: impressions.id });

  if (qualified) {
    // Increment impressionsServed on the adBlock
    await db
      .update(adBlocks)
      .set({
        impressionsServed: sql`${adBlocks.impressionsServed} + 1`,
      })
      .where(eq(adBlocks.id, blockId));

    // Look up bidAmount for earning calculation
    const [block] = await db
      .select({ bidAmount: adBlocks.bidAmount })
      .from(adBlocks)
      .where(eq(adBlocks.id, blockId))
      .limit(1);

    if (block) {
      // earning = (bidAmount / IMPRESSIONS_PER_BLOCK) * REVENUE_SPLIT
      const earningAmount = Math.floor((block.bidAmount / IMPRESSIONS_PER_BLOCK) * REVENUE_SPLIT);

      if (earningAmount > 0) {
        await db.insert(earnings).values({
          userId: authReq.userId!,
          impressionId: impression.id,
          amount: earningAmount,
          type: 'impression',
        });

        // BUG-06: Track lifetimeEarned on user
        await db
          .update(users)
          .set({ lifetimeEarned: sql`${users.lifetimeEarned} + ${earningAmount}` })
          .where(eq(users.id, authReq.userId!));

        // BUG-05: Track campaign.spent via adBlock → ad → campaign chain
        const [adRow] = await db
          .select({ campaignId: ads.campaignId })
          .from(ads)
          .where(eq(ads.id, adId))
          .limit(1);

        if (adRow) {
          await db
            .update(campaigns)
            .set({ spent: sql`${campaigns.spent} + ${earningAmount}` })
            .where(eq(campaigns.id, adRow.campaignId));
        }
      }
    }

    // BUG-07: Mark adBlock exhausted when impressions are used up
    await db
      .update(adBlocks)
      .set({ status: 'exhausted' })
      .where(and(eq(adBlocks.id, blockId), sql`${adBlocks.impressionsServed} >= ${adBlocks.impressionsTotal}`));
  }

  res.json({ id: impression.id, qualified });
});

router.post('/click', authMiddleware, clickLimiter, validate(clickSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { impressionId, adId, idempotencyKey } = req.body;

  // Idempotency: check if click with this key already exists
  const existing = await db
    .select({ id: clicks.id })
    .from(clicks)
    .where(eq(clicks.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    res.json({ id: existing[0].id });
    return;
  }

  // Insert click
  const [click] = await db
    .insert(clicks)
    .values({
      impressionId,
      userId: authReq.userId!,
      adId,
      idempotencyKey,
      ipAddress: req.ip ?? null,
    })
    .returning({ id: clicks.id });

  // Look up the impression's adBlock to get bidAmount
  const [imp] = await db
    .select({ adBlockId: impressions.adBlockId })
    .from(impressions)
    .where(eq(impressions.id, impressionId))
    .limit(1);

  if (imp) {
    const [block] = await db
      .select({ bidAmount: adBlocks.bidAmount })
      .from(adBlocks)
      .where(eq(adBlocks.id, imp.adBlockId))
      .limit(1);

    if (block) {
      // earning = (bidAmount / IMPRESSIONS_PER_BLOCK) * CLICK_MULTIPLIER * REVENUE_SPLIT
      const earningAmount = Math.floor((block.bidAmount / IMPRESSIONS_PER_BLOCK) * CLICK_MULTIPLIER * REVENUE_SPLIT);

      if (earningAmount > 0) {
        await db.insert(earnings).values({
          userId: authReq.userId!,
          clickId: click.id,
          amount: earningAmount,
          type: 'click',
        });

        // BUG-06: Track lifetimeEarned on user
        await db
          .update(users)
          .set({ lifetimeEarned: sql`${users.lifetimeEarned} + ${earningAmount}` })
          .where(eq(users.id, authReq.userId!));
      }
    }
  }

  res.json({ id: click.id });
});

export default router;
