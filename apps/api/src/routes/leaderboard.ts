import { Router } from 'express';
import { sql, desc, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { earnings, users } from '../db/schema.js';

const router = Router();

function getDateRange(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'daily': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'monthly': return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'alltime': return null;
    default: return null;
  }
}

// GET /leaderboard?period=weekly&limit=50 — public, no auth
router.get('/', async (req, res) => {
  try {
    const period = (['daily', 'weekly', 'monthly', 'alltime'].includes(req.query.period as string))
      ? (req.query.period as string)
      : 'weekly';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const since = getDateRange(period);

    const conditions = since ? gte(earnings.createdAt, since) : undefined;

    const rows = await db
      .select({
        userId: earnings.userId,
        earnedPaise: sql<number>`sum(${earnings.amount})::int`,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(earnings)
      .innerJoin(users, sql`${earnings.userId} = ${users.id}`)
      .where(conditions)
      .groupBy(earnings.userId, users.name, users.avatarUrl)
      .orderBy(desc(sql`sum(${earnings.amount})`))
      .limit(limit);

    const entries = rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.userId,
      name: row.name,
      avatarUrl: row.avatarUrl,
      earnedPaise: row.earnedPaise,
    }));

    res.json({ period, entries });
  } catch (err) {
    console.error('GET /leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
