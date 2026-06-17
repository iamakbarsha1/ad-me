import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { googleAuthSchema, refreshTokenSchema } from '@ad-me/shared';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/google', validate(googleAuthSchema), async (req, res) => {
  // TODO: Verify Google token, upsert user, issue JWT
  res.status(501).json({ error: 'Not implemented' });
});

router.post('/refresh', validate(refreshTokenSchema), async (req, res) => {
  // TODO: Verify refresh token, issue new access token
  res.status(501).json({ error: 'Not implemented' });
});

router.get('/me', authMiddleware, async (req: any, res) => {
  // TODO: Return current user profile
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
