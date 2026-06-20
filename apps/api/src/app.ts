import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { defaultLimiter } from './middleware/rate-limit.js';
import authRoutes from './routes/auth.js';
import adRoutes from './routes/ads.js';
import telemetryRoutes from './routes/telemetry.js';
import campaignRoutes from './routes/campaigns.js';
import auctionRoutes from './routes/auction.js';
import billingRoutes from './routes/billing.js';
import earningsRoutes from './routes/earnings.js';
import payoutRoutes from './routes/payouts.js';
import webhookRoutes from './routes/webhooks.js';
import killswitchRoutes from './routes/killswitch.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'] }));

// Webhooks need raw body for HMAC signature verification — mount before express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(defaultLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/ads', adRoutes);
app.use('/telemetry', telemetryRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/auction', auctionRoutes);
app.use('/billing', billingRoutes);
app.use('/earnings', earningsRoutes);
app.use('/payouts', payoutRoutes);
app.use('/killswitch', killswitchRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/admin', adminRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
