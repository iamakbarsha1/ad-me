import { Router } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import { authMiddleware, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminUpdateCampaignSchema, adminUpdateUserRoleSchema } from '@ad-me/shared';
import { db } from '../db/index.js';
import { users, advertisers, campaigns, ads, impressions, clicks, earnings } from '../db/schema.js';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

// GET /admin/stats — aggregate platform stats
router.get('/stats', async (_req, res) => {
  try {
    const [[userCount], [advertiserCount], [campaignCount], [adCount], [impressionCount], [clickCount], [earningsSum], [balanceSum]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(advertisers),
      db.select({ count: sql<number>`count(*)::int` }).from(campaigns),
      db.select({ count: sql<number>`count(*)::int` }).from(ads),
      db.select({ count: sql<number>`count(*)::int` }).from(impressions),
      db.select({ count: sql<number>`count(*)::int` }).from(clicks),
      db.select({ total: sql<number>`coalesce(sum(${earnings.amount}), 0)::int` }).from(earnings),
      db.select({ total: sql<number>`coalesce(sum(${advertisers.balance}), 0)::int` }).from(advertisers),
    ]);

    res.json({
      totalUsers: userCount.count,
      totalAdvertisers: advertiserCount.count,
      totalCampaigns: campaignCount.count,
      totalAds: adCount.count,
      totalImpressions: impressionCount.count,
      totalClicks: clickCount.count,
      totalEarningsPaise: earningsSum.total,
      totalAdvertiserBalancePaise: balanceSum.total,
    });
  } catch (err) {
    console.error('GET /admin/stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/campaigns?page=1&limit=20&status=active
router.get('/campaigns', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    let query = db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        budget: campaigns.budget,
        spent: campaigns.spent,
        createdAt: campaigns.createdAt,
        advertiserName: advertisers.companyName,
        advertiserEmail: users.email,
      })
      .from(campaigns)
      .innerJoin(advertisers, eq(campaigns.advertiserId, advertisers.id))
      .innerJoin(users, eq(advertisers.userId, users.id))
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset);

    if (statusFilter && ['draft', 'active', 'paused', 'completed'].includes(statusFilter)) {
      query = query.where(eq(campaigns.status, statusFilter as 'draft' | 'active' | 'paused' | 'completed')) as typeof query;
    }

    const rows = await query;

    res.json({
      campaigns: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
      page,
      limit,
    });
  } catch (err) {
    console.error('GET /admin/campaigns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /admin/campaigns/:id — moderation: update campaign status
router.patch('/campaigns/:id', validate(adminUpdateCampaignSchema), async (req, res) => {
  try {
    const campaignId = String(req.params.id);
    const { status } = req.body as { status: 'active' | 'paused' | 'completed' };

    const [updated] = await db
      .update(campaigns)
      .set({ status, updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
      .returning({ id: campaigns.id, status: campaigns.status });

    if (!updated) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('PATCH /admin/campaigns/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /admin/users/:id/role — promote/demote user role
router.patch('/users/:id/role', validate(adminUpdateUserRoleSchema), async (req, res) => {
  try {
    const userId = String(req.params.id);
    const { role } = req.body as { role: 'developer' | 'advertiser' | 'admin' };

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, role: users.role });

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('PATCH /admin/users/:id/role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
