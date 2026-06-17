import { Router } from 'express';
import { db } from '../db/index.js';
import { killswitch } from '../db/schema.js';
import type { KillswitchStatus } from '@ad-me/shared';

const router = Router();

router.get('/', async (_req, res) => {
  const rows = await db.select().from(killswitch).limit(1);

  if (rows.length === 0) {
    const status: KillswitchStatus = { enabled: false, reason: null };
    res.json(status);
    return;
  }

  const row = rows[0];
  const status: KillswitchStatus = {
    enabled: row.enabled,
    reason: row.reason,
  };
  res.json(status);
});

export default router;
