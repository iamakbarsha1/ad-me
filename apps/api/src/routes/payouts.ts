import { Router } from 'express';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { validate } from '../middleware/validate.js';
import { payoutRequestSchema, payoutSettingsSchema, MIN_PAYOUT_PAISE } from '@ad-me/shared';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { payouts, users } from '../db/schema.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const rows = await db
      .select()
      .from(payouts)
      .where(eq(payouts.userId, authReq.userId!))
      .orderBy(desc(payouts.requestedAt));

    res.json({ payouts: rows });
  } catch (err) {
    console.error('GET /payouts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/request', validate(payoutRequestSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId!;
    const requestedAmount: number | undefined = req.body.amount;

    // Get user's lifetime earned and payout details
    const [user] = await db
      .select({ lifetimeEarned: users.lifetimeEarned, payoutDetails: users.payoutDetails })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.payoutDetails) {
      res.status(400).json({ error: 'Payout settings not configured. Please set up UPI or bank transfer details first.' });
      return;
    }

    // Sum all non-failed payouts to determine already-claimed amount
    const [claimedResult] = await db
      .select({ total: sql<number>`coalesce(sum(${payouts.amount}), 0)` })
      .from(payouts)
      .where(
        and(
          eq(payouts.userId, userId),
          inArray(payouts.status, ['pending', 'processing', 'completed']),
        ),
      );

    const claimed = Number(claimedResult?.total ?? 0);
    const available = user.lifetimeEarned - claimed;

    const amount = requestedAmount ?? available;

    if (amount < MIN_PAYOUT_PAISE) {
      res.status(400).json({
        error: `Minimum payout is ${MIN_PAYOUT_PAISE} paise (INR ${MIN_PAYOUT_PAISE / 100}). Requested: ${amount} paise.`,
      });
      return;
    }

    if (amount > available) {
      res.status(400).json({
        error: `Requested amount (${amount} paise) exceeds available balance (${available} paise).`,
      });
      return;
    }

    const details = user.payoutDetails as { method: string; [key: string]: unknown };

    const [payout] = await db
      .insert(payouts)
      .values({
        userId,
        amount,
        payoutMethod: details.method as 'upi' | 'bank_transfer',
        payoutDetails: user.payoutDetails,
      })
      .returning();

    res.status(201).json({ payout });
  } catch (err) {
    console.error('POST /payouts/request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', validate(payoutSettingsSchema), async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const [user] = await db
      .update(users)
      .set({ payoutDetails: req.body, updatedAt: new Date() })
      .where(eq(users.id, authReq.userId!))
      .returning({ id: users.id, payoutDetails: users.payoutDetails });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ payoutDetails: user.payoutDetails });
  } catch (err) {
    console.error('PUT /payouts/settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
