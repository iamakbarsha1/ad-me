import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function verifyDodoSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.DODO_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }
    console.warn('[dodo-webhook] DODO_WEBHOOK_SECRET not set — skipping signature verification (dev mode)');
    next();
    return;
  }

  const signature = req.headers['x-dodo-signature'] as string | undefined;

  if (!signature) {
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  const rawBody = req.body as Buffer;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  next();
}
