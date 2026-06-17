import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

// Dynamic import so dotenv loads before db/index.ts reads DATABASE_URL
const { db } = await import('../db/index.js');
const { users, advertisers, campaigns, ads, adBlocks, killswitch } = await import('../db/schema.js');

async function seed() {
  console.log('Seeding ad-me database...');

  // 1. Insert test user
  const [user] = await db
    .insert(users)
    .values({
      googleId: 'test-google-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'advertiser',
    })
    .returning({ id: users.id });
  console.log('Created user:', user.id);

  // 2. Insert advertiser (balance = 10,000,000 paise = INR 100,000)
  const [advertiser] = await db
    .insert(advertisers)
    .values({
      userId: user.id,
      companyName: 'TestCo',
      balance: 10_000_000,
    })
    .returning({ id: advertisers.id });
  console.log('Created advertiser:', advertiser.id);

  // 3. Insert campaign (budget = 5,000,000 paise = INR 50,000)
  const [campaign] = await db
    .insert(campaigns)
    .values({
      advertiserId: advertiser.id,
      name: 'Test Campaign',
      status: 'active',
      budget: 5_000_000,
    })
    .returning({ id: campaigns.id });
  console.log('Created campaign:', campaign.id);

  // 4. Insert 4 ads (one per surface)
  const adData = [
    {
      surface: 'spinner_overlay' as const,
      title: 'Try DevTools Pro',
      body: 'Boost your workflow 10x',
      ctaText: 'Learn More',
      ctaUrl: 'https://example.com/devtools',
      bidAmount: 2000,
    },
    {
      surface: 'thinking_shimmer' as const,
      title: 'CloudDB Free Tier',
      body: 'Start building for free',
      ctaText: 'Sign Up',
      ctaUrl: 'https://example.com/clouddb',
      bidAmount: 1500,
    },
    {
      surface: 'status_bar' as const,
      title: 'Sponsored by TestCo',
      body: 'Premium developer tools',
      ctaText: 'Visit',
      ctaUrl: 'https://example.com',
      bidAmount: 1000,
    },
    {
      surface: 'spinner_verb' as const,
      title: 'Powered by TestCo',
      body: 'Fast builds',
      ctaText: 'Try Now',
      ctaUrl: 'https://example.com/try',
      bidAmount: 800,
    },
  ];

  for (const ad of adData) {
    const [insertedAd] = await db
      .insert(ads)
      .values({
        campaignId: campaign.id,
        title: ad.title,
        body: ad.body,
        ctaText: ad.ctaText,
        ctaUrl: ad.ctaUrl,
        status: 'active',
        surface: ad.surface,
      })
      .returning({ id: ads.id });
    console.log(`Created ad (${ad.surface}):`, insertedAd.id);

    // 5. Insert ad block for this ad
    const [block] = await db
      .insert(adBlocks)
      .values({
        campaignId: campaign.id,
        adId: insertedAd.id,
        surface: ad.surface,
        bidAmount: ad.bidAmount,
        impressionsTotal: 1000,
      })
      .returning({ id: adBlocks.id });
    console.log(`Created adBlock (${ad.surface}):`, block.id);
  }

  // 6. Insert killswitch row (disabled)
  const [ks] = await db
    .insert(killswitch)
    .values({
      enabled: false,
      reason: null,
    })
    .returning({ id: killswitch.id });
  console.log('Created killswitch row:', ks.id);

  console.log('\nSeed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
