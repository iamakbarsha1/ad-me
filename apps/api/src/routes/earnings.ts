import { Router } from 'express';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { earnings, users } from '../db/schema.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId!;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayResult] = await db
      .select({ total: sql<number>`coalesce(sum(${earnings.amount}), 0)` })
      .from(earnings)
      .where(and(eq(earnings.userId, userId), gte(earnings.createdAt, startOfToday)));

    const [monthResult] = await db
      .select({ total: sql<number>`coalesce(sum(${earnings.amount}), 0)` })
      .from(earnings)
      .where(and(eq(earnings.userId, userId), gte(earnings.createdAt, startOfMonth)));

    const [user] = await db
      .select({ lifetimeEarned: users.lifetimeEarned })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      today: Number(todayResult?.total ?? 0),
      thisMonth: Number(monthResult?.total ?? 0),
      lifetime: user?.lifetimeEarned ?? 0,
    });
  } catch (err) {
    console.error('GET /earnings/summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId!;

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const type = req.query.type as string | undefined;
    const offset = (page - 1) * limit;

    const conditions = [eq(earnings.userId, userId)];
    if (type === 'impression' || type === 'click') {
      conditions.push(eq(earnings.type, type));
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(earnings)
      .where(whereClause);

    const rows = await db
      .select()
      .from(earnings)
      .where(whereClause)
      .orderBy(desc(earnings.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      earnings: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    console.error('GET /earnings/history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
