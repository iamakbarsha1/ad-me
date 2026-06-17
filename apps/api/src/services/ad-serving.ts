import { eq, and, lt, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { adBlocks, ads, campaigns } from '../db/schema.js';
import type { AdServeResponse, AdSurface } from '@ad-me/shared';
import { randomUUID } from 'node:crypto';

export async function getNextAd(surface: AdSurface): Promise<AdServeResponse | null> {
  // Auction: find the highest-bidding active adBlock for this surface
  // that still has impressions remaining and whose campaign has budget left
  const results = await db
    .select({
      blockId: adBlocks.id,
      bidAmount: adBlocks.bidAmount,
      adId: ads.id,
      adTitle: ads.title,
      adBody: ads.body,
      adCtaText: ads.ctaText,
      adCtaUrl: ads.ctaUrl,
      adImageUrl: ads.imageUrl,
      adSurface: ads.surface,
    })
    .from(adBlocks)
    .innerJoin(ads, eq(adBlocks.adId, ads.id))
    .innerJoin(campaigns, eq(adBlocks.campaignId, campaigns.id))
    .where(
      and(
        eq(adBlocks.surface, surface),
        eq(adBlocks.status, 'active'),
        eq(ads.status, 'active'),
        eq(campaigns.status, 'active'),
        // impressionsServed < impressionsTotal
        sql`${adBlocks.impressionsServed} < ${adBlocks.impressionsTotal}`,
        // campaign.spent < campaign.budget
        sql`${campaigns.spent} < ${campaigns.budget}`,
      ),
    )
    .orderBy(desc(adBlocks.bidAmount), asc(adBlocks.createdAt))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const winner = results[0];

  return {
    ad: {
      id: winner.adId,
      title: winner.adTitle,
      body: winner.adBody,
      ctaText: winner.adCtaText,
      ctaUrl: winner.adCtaUrl,
      imageUrl: winner.adImageUrl,
      surface: winner.adSurface,
    },
    impressionId: randomUUID(),
    blockId: winner.blockId,
  };
}
