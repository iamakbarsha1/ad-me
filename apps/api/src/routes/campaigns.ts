import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema, updateCampaignSchema, createAdSchema } from '@ad-me/shared';
import { authMiddleware, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { campaigns, advertisers, ads } from '../db/schema.js';

const router = Router();

router.use(authMiddleware, requireRole('advertiser', 'admin'));

router.get('/', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const rows = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        budget: campaigns.budget,
        spent: campaigns.spent,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        adCount: sql<number>`cast(count(${ads.id}) as int)`,
      })
      .from(campaigns)
      .leftJoin(ads, eq(ads.campaignId, campaigns.id))
      .where(eq(campaigns.advertiserId, advertiser.id))
      .groupBy(campaigns.id)
      .orderBy(campaigns.createdAt);

    res.json({ campaigns: rows });
  } catch (err) {
    console.error('GET /campaigns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, String(req.params.id)), eq(campaigns.advertiserId, advertiser.id)))
      .limit(1);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json({ campaign });
  } catch (err) {
    console.error('GET /campaigns/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(createCampaignSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, budget, startDate, endDate } = req.body;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const [campaign] = await db
      .insert(campaigns)
      .values({
        advertiserId: advertiser.id,
        name,
        budget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      })
      .returning();

    res.status(201).json({ campaign });
  } catch (err) {
    console.error('POST /campaigns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', validate(updateCampaignSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const campaignId = String(req.params.id);

    const [existing] = await db
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.advertiserId, advertiser.id)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (existing.status === 'completed') {
      res.status(400).json({ error: 'Cannot update a completed campaign' });
      return;
    }

    const { name, status, budget, endDate } = req.body as {
      name?: string;
      status?: 'active' | 'paused';
      budget?: number;
      endDate?: string;
    };

    const [campaign] = await db
      .update(campaigns)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(budget !== undefined ? { budget } : {}),
        ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    res.json({ campaign });
  } catch (err) {
    console.error('PATCH /campaigns/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const deleteId = String(req.params.id);

    const [existing] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, deleteId), eq(campaigns.advertiserId, advertiser.id)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const [campaign] = await db
      .update(campaigns)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(campaigns.id, deleteId))
      .returning();

    res.json({ campaign });
  } catch (err) {
    console.error('DELETE /campaigns/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ad sub-routes

router.get('/:campaignId/ads', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const cId = String(req.params.campaignId);

    const [campaign] = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, cId), eq(campaigns.advertiserId, advertiser.id)))
      .limit(1);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const adRows = await db
      .select()
      .from(ads)
      .where(eq(ads.campaignId, cId))
      .orderBy(ads.createdAt);

    res.json({ ads: adRows });
  } catch (err) {
    console.error('GET /campaigns/:campaignId/ads error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:campaignId/ads', validate(createAdSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [advertiser] = await db
      .select({ id: advertisers.id })
      .from(advertisers)
      .where(eq(advertisers.userId, authReq.userId!))
      .limit(1);

    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser profile not found' });
      return;
    }

    const adCampaignId = String(req.params.campaignId);

    const [campaign] = await db
      .select({ id: campaigns.id, status: campaigns.status })
      .from(campaigns)
      .where(and(eq(campaigns.id, adCampaignId), eq(campaigns.advertiserId, advertiser.id)))
      .limit(1);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const { title, body, ctaText, ctaUrl, imageUrl, surface } = req.body as {
      title: string;
      body: string;
      ctaText: string;
      ctaUrl: string;
      imageUrl?: string;
      surface: 'spinner_overlay' | 'thinking_shimmer' | 'status_bar' | 'spinner_verb';
    };

    const [ad] = await db
      .insert(ads)
      .values({
        campaignId: adCampaignId,
        title,
        body,
        ctaText,
        ctaUrl,
        imageUrl: imageUrl ?? null,
        surface,
      })
      .returning();

    res.status(201).json({ ad });
  } catch (err) {
    console.error('POST /campaigns/:campaignId/ads error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
