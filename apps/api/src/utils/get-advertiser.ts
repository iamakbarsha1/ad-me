import { eq } from 'drizzle-orm';
import type { Response } from 'express';
import { db } from '../db/index.js';
import { advertisers } from '../db/schema.js';

export async function getAdvertiserOrFail(userId: string, res: Response) {
  const [advertiser] = await db
    .select({ id: advertisers.id, balance: advertisers.balance })
    .from(advertisers)
    .where(eq(advertisers.userId, userId))
    .limit(1);

  if (!advertiser) {
    res.status(404).json({ error: 'Advertiser profile not found' });
    return null;
  }

  return advertiser;
}
