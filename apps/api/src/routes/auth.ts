import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { googleAuthSchema, refreshTokenSchema } from '@ad-me/shared';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  verifyGoogleToken,
  upsertUser,
  signTokenPair,
  verifyRefreshToken,
  getUserById,
} from '../services/auth.js';

const router = Router();

router.post('/google', validate(googleAuthSchema), async (req, res) => {
  try {
    const { token } = req.body;
    const googlePayload = await verifyGoogleToken(token);
    const user = await upsertUser(googlePayload);
    const tokens = signTokenPair(user.id, user.role);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        lifetimeEarned: user.lifetimeEarned,
      },
      ...tokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    res.status(401).json({ error: message });
  }
});

router.post('/refresh', validate(refreshTokenSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { sub, role } = verifyRefreshToken(refreshToken);
    const user = await getUserById(sub);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const tokens = signTokenPair(user.id, user.role);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await getUserById(req.userId!);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      lifetimeEarned: user.lifetimeEarned,
      payoutDetails: user.payoutDetails,
      createdAt: user.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
