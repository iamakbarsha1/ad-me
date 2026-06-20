# ad-me Monorepo Code Review

**Reviewed by**: Relentless Reviewer
**Date**: 2026-06-20
**Scope**: Full-stack review of web UI flows, API correctness, auth, ad serving, billing, and general code quality
**Files Reviewed**: 30+ files across apps/web, apps/api, packages/shared

---

## Executive Summary

The ad-me monorepo implements a complete ad platform (VS Code extension ads during AI thinking time) with Express 5 API, Next.js 15 web dashboard, and a shared Zod+TypeScript package. The codebase has a solid architectural foundation with proper separation of concerns, Zod validation on API routes, idempotency on telemetry endpoints, and rate limiting.

**However, there are multiple frontend-backend field name mismatches that will cause the UI to display blank/zero values despite successful API responses.** This is the primary reason the "UI doesn't feel like it's working." Additionally, the billing deposit form sends the wrong field name, so deposits will always fail with a 400 validation error. There are also several architectural gaps: no advertiser profile creation flow, no token refresh mechanism in the web client, missing campaign.spent tracking, and a race condition in the auction balance deduction.

---

## Risk Score: 7/10

**Justification**: Multiple P0 bugs that make core user flows non-functional (campaign display shows $0, billing deposit always fails, no advertiser onboarding path). Significant security concerns with open CORS, weak dev JWT secrets, and a race condition in the financial balance deduction logic. The backend logic is generally sound, but the frontend-backend contract is broken in several critical places that render the product unusable for advertisers.

---

## P0 -- CRITICAL BUGS (User Flows Broken)

### BUG-01: Campaign list and detail pages display all-zero financial values

**Files**:
- `apps/web/src/app/(advertiser)/campaigns/page.tsx:11-12` (interface expects `budgetPaise`, `spentPaise`)
- `apps/web/src/app/(advertiser)/campaigns/[id]/page.tsx:11-12` (same)
- `apps/api/src/routes/campaigns.ts:33-34` (API returns `budget`, `spent`)

**What happens**: The API returns `{ budget: 50000, spent: 0 }`. The frontend interface expects `{ budgetPaise: 50000, spentPaise: 0 }`. Because `budgetPaise` and `spentPaise` are `undefined`, every campaign shows "INR 0.00" for both budget and spent. `formatINR(undefined)` produces `NaN`.

**Impact**: Advertisers cannot see any campaign financial data. The entire campaigns list page appears broken. Edit mode pre-fills budget as "0.00" (line 120: `campaign.budgetPaise / 100` = `undefined / 100` = `NaN`).

**Fix**: In both frontend Campaign interfaces, rename `budgetPaise`/`spentPaise` to `budget`/`spent` to match the API response. Update all references (`formatINR(c.budget)`, `formatINR(c.spent)`, `setEditBudget((campaign.budget / 100).toFixed(2))`).

---

### BUG-02: Billing deposit always fails with 400 validation error

**Files**:
- `apps/web/src/app/(advertiser)/billing/page.tsx:49` (sends `{ amountPaise: ... }`)
- `packages/shared/src/schemas/index.ts:81-83` (depositSchema expects `{ amount: ... }`)

**What happens**: The frontend sends `{ amountPaise: 50000 }`. The Zod schema requires `{ amount: z.number().int().positive() }`. The `amount` field is missing, so validation fails every time with: `{ error: "Validation failed", details: { amount: ["Required"] } }`.

**Impact**: Advertisers cannot deposit money. The entire billing flow is broken. No funds = no bids = no ads served.

**Fix**: Change line 49 from `amountPaise: Math.round(parseFloat(amount) * 100)` to `amount: Math.round(parseFloat(amount) * 100)`.

---

### BUG-03: No advertiser profile creation path exists

**Files**:
- `apps/api/src/services/auth.ts:39-60` (upsertUser creates a `users` row only)
- `apps/api/src/routes/campaigns.ts:17-26` (every route requires an `advertisers` row)
- `apps/api/src/routes/auction.ts:35-44` (bid requires advertiser)
- `apps/api/src/routes/billing.ts:60-69` (deposit requires advertiser)

**What happens**: When a user signs up via Google OAuth, only a `users` row is created with `role: 'developer'`. Even if an admin changes their role to `advertiser`, there is no code anywhere that creates a row in the `advertisers` table (only the seed script does it). Every advertiser API endpoint returns `404: "Advertiser profile not found"`.

**Impact**: No real user can ever function as an advertiser. Campaign creation, billing, and bidding all fail at the first query. This is a complete blocker for the advertiser side of the product.

**Fix**: Either (a) create an advertiser registration endpoint that inserts into `advertisers`, or (b) auto-create an advertiser row in `upsertUser` when the role is changed to `advertiser`, or (c) add it to the admin role-change endpoint at `PATCH /admin/users/:id/role`.

---

### BUG-04: Earnings history response uses wrong field name

**Files**:
- `apps/web/src/app/(dashboard)/earnings/page.tsx:26-30` (expects `events` or `history` array)
- `apps/api/src/routes/earnings.ts:77-85` (returns `{ earnings: [...] }`)

**What happens**: The API returns `{ earnings: [...], pagination: {...} }`. The frontend looks for `data.events ?? data.history ?? []`. Neither exists, so the earnings history table is always empty even when earnings records exist in the database.

**Fix**: Change line 78 from `data.events ?? data.history ?? []` to `(data as any).earnings ?? data.events ?? data.history ?? []`. Better: define the interface to match what the API actually returns.

---

## P1 -- HIGH SEVERITY

### BUG-05: campaign.spent is never updated -- budget guard is ineffective

**Files**:
- `apps/api/src/routes/telemetry.ts` (records impressions but never increments campaign.spent)
- `apps/api/src/services/ad-serving.ts:34` (filters on `campaigns.spent < campaigns.budget`)

**What happens**: `campaigns.spent` is initialized to 0 and never updated. The ad-serving query's budget guard `campaigns.spent < campaigns.budget` is always true, so campaigns never stop serving even when the budget should be exhausted. Advertisers are never charged against their campaign budget.

**Impact**: Budget limits don't work. Ads serve indefinitely. Advertisers' campaign budget data is always zero.

---

### BUG-06: lifetimeEarned is never updated -- earnings summary shows stale data

**Files**:
- `apps/api/src/routes/telemetry.ts:66-72,126-132` (inserts into `earnings` table but never updates `users.lifetimeEarned`)
- `apps/api/src/routes/earnings.ts:30-34` (reads `users.lifetimeEarned` for lifetime display)
- `apps/api/src/routes/payouts.ts:38` (uses `lifetimeEarned` to calculate available payout balance)

**What happens**: When an impression or click earning is recorded, a row is inserted into the `earnings` table, but `users.lifetime_earned` is never incremented. The lifetime summary always shows 0. More critically, payout available balance (`lifetimeEarned - claimed`) is always 0 or negative, so no developer can ever request a payout.

**Impact**: Developer lifetime earnings always show 0. Payout requests always fail due to insufficient balance.

---

### BUG-07: adBlock status never transitions to "exhausted"

**Files**:
- `apps/api/src/routes/telemetry.ts:47-52` (increments `impressionsServed` but never checks >= `impressionsTotal`)
- `apps/api/src/services/ad-serving.ts:32` (queries `impressionsServed < impressionsTotal`)

**What happens**: When `impressionsServed` reaches `impressionsTotal`, the adBlock should be marked as `exhausted`. Instead, it stays `active` forever. The only guard is the SQL comparison in the serving query, which works, but the block's status is never updated, leading to stale data in billing transaction displays and potential edge cases.

---

### BUG-08: Ad impressionId generated pre-insert, not from actual impression record

**Files**:
- `apps/api/src/services/ad-serving.ts:56` (generates `randomUUID()` for `impressionId`)
- `apps/api/src/routes/telemetry.ts:30-43` (creates actual impression with a different ID)
- `apps/api/src/db/schema.ts:79` (adBlockId is required FK on impressions)

**What happens**: `getNextAd()` returns `impressionId: randomUUID()` which is a client-side hint, not an actual database record. The extension then posts to `/telemetry/impression` which creates a real impression with a *different* auto-generated UUID. The `impressionId` returned by ad-serving has no database row behind it -- it is a phantom ID. If the extension tries to use this ID for click tracking, the `impressionId` FK constraint on clicks will fail.

**Impact**: Click tracking likely fails if the extension uses the `impressionId` from `getNextAd()` for the click schema's `impressionId` field.

---

### SEC-01: Race condition in auction bid balance deduction

**Files**:
- `apps/api/src/routes/auction.ts:35-68`

**What happens**: The balance check at line 46 (`advertiser.balance < totalCost`) reads the balance, then inside the transaction at line 57, deducts it with `balance - totalCost`. Between the read and the transaction, another concurrent bid request can pass the balance check. Two concurrent bids for the same advertiser can both pass the balance check and both deduct, resulting in a negative balance.

**Exploitability**: Moderate -- requires concurrent API calls, easily done with a script.

**Fix**: Move the balance check inside the transaction using `SELECT ... FOR UPDATE`:
```sql
-- inside the transaction:
SELECT balance FROM advertisers WHERE id = $1 FOR UPDATE;
-- then check and deduct atomically
```

---

### SEC-02: CORS configured with no origin restriction

**File**: `apps/api/src/app.ts:21`

```typescript
app.use(cors());
```

This allows any website to make authenticated requests to the API. An attacker can host a page that makes API calls with the victim's localStorage token (if XSS is possible) or exploit any CSRF vector.

**Severity**: High
**Fix**: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'] }));`

---

### SEC-03: Tokens stored in localStorage -- XSS-exploitable

**Files**:
- `apps/web/src/lib/auth-context.tsx:50-54` (stores full token set in localStorage)
- `apps/web/src/lib/api.ts:29` (reads accessToken from localStorage)

**Risk**: Any XSS vulnerability (ad content injection, third-party script, etc.) can steal the access and refresh tokens from localStorage. Given that this is an ad platform that renders user-supplied ad content (titles, body text, URLs), XSS risk is elevated.

**Severity**: High
**Fix**: Store tokens in memory (React state) only. Use httpOnly cookies for the refresh token. The access token can stay in memory since it is short-lived.

---

### SEC-04: No token refresh mechanism in web client

**Files**:
- `apps/web/src/lib/api.ts` (no 401 retry, no refresh logic)
- `apps/web/src/lib/auth-context.tsx` (stores refreshToken but never uses it)

**What happens**: The access token expires after 15 minutes (JWT_ACCESS_TTL). After that, every API call returns 401. The user has to manually log in again. The refresh token (30-day TTL) is stored in localStorage but never used.

**Impact**: Users are silently logged out after 15 minutes. All API calls fail. The user sees "Request failed" errors everywhere with no explanation or recovery.

---

## P2 -- MEDIUM SEVERITY

### BUG-09: Delete campaign sends PATCH (soft delete) but updateCampaignSchema rejects "completed" status

**Files**:
- `apps/web/src/app/(advertiser)/campaigns/page.tsx:110` (sends `{ status: 'completed' }` via PATCH)
- `packages/shared/src/schemas/index.ts:41` (`updateCampaignSchema.status: z.enum(['active', 'paused'])`)

**What happens**: The frontend "Delete" button sends `PATCH /campaigns/:id { status: 'completed' }`. But the Zod schema only allows `'active' | 'paused'` for status updates. This returns a 400 validation error. Campaigns cannot be deleted from the UI.

**Fix**: Either add `'completed'` to the updateCampaignSchema status enum, or use the dedicated `DELETE /campaigns/:id` endpoint instead of PATCH.

---

### BUG-10: Campaign create sends `budget` in paise but label says "INR"

**Files**:
- `apps/web/src/app/(advertiser)/campaigns/page.tsx:80` (`Math.round(parseFloat(createBudget) * 100)`)
- `apps/web/src/app/(advertiser)/campaigns/page.tsx:167-177` (label says "Budget (INR)", placeholder "500.00")

**What happens**: The form label says "Budget (INR)" and the user enters 500.00 (INR). The code multiplies by 100 to get paise. This is correct behavior, but the edit pre-fill at line 120 does `campaign.budgetPaise / 100` -- with BUG-01 fixed to use `campaign.budget`, this becomes correct. However, the bid form (line 189) also multiplies by 100, with label "INR per 1000 impressions". The floor prices in constants are already in paise (e.g., spinner_overlay = 1500 paise = INR 15). If a user enters "15" thinking INR, they send 1500 paise -- this matches the floor price. This conversion is correct but fragile -- there is no validation feedback telling the user the floor price in INR.

---

### BUG-11: Bid form preserves stale `adSurface` from ad creation form

**File**: `apps/web/src/app/(advertiser)/campaigns/[id]/page.tsx:188`

When the bid form posts to `/auction/bid`, it uses `surface: adSurface` (line 188). But `adSurface` is the surface from the ad creation form state. If the user creates an ad, the form closes, then the bid form appears -- `adSurface` still holds the value from creation. This works in the happy path but is fragile. If the user somehow clears the surface selector between creation and bidding, the bid will fail.

---

### SEC-05: Webhook signature verification bypassed when DODO_WEBHOOK_SECRET is unset

**File**: `apps/api/src/middleware/verify-dodo-signature.ts:7-10`

When `DODO_WEBHOOK_SECRET` is not set, the middleware calls `next()` with only a console warning. In production, if the env var is accidentally missing, any HTTP client can POST fake webhook events to credit arbitrary advertiser balances.

**Severity**: High (in production), Medium (currently development)
**Exploitability**: Trivial if the env var is missing.

---

### SEC-06: Webhook payment.completed trusts `advertiserId` from payload without verification

**File**: `apps/api/src/routes/webhooks.ts:24`

The webhook handler extracts `advertiserId` directly from the event payload and credits that advertiser's balance. If an attacker can forge webhook requests (see SEC-05), they can credit any advertiser's balance with any amount.

Additionally, there is no check that the `advertiserId` corresponds to the payment that was actually completed. A legitimate Dodo webhook for one advertiser's payment could theoretically contain a different `advertiserId`.

---

### ARCH-01: Repeated advertiser lookup pattern across all routes

**Files**: campaigns.ts (5x), auction.ts (1x), billing.ts (2x)

Every route handler in campaigns, auction, and billing starts with the same 6 lines:
```typescript
const [advertiser] = await db
  .select({ id: advertisers.id })
  .from(advertisers)
  .where(eq(advertisers.userId, authReq.userId!))
  .limit(1);
if (!advertiser) { ... }
```

This is duplicated 8+ times. Should be extracted into a middleware or helper function:
```typescript
async function getAdvertiserOrFail(userId: string, res: Response): Promise<{ id: string } | null>
```

---

### ARCH-02: Duplicate type definitions between frontend and shared package

**Files**:
- `packages/shared/src/types/index.ts` (canonical Campaign, Ad, User types)
- `apps/web/src/app/(advertiser)/campaigns/page.tsx:7-16` (local Campaign interface)
- `apps/web/src/app/(advertiser)/campaigns/[id]/page.tsx:7-15` (local Campaign interface)
- `apps/web/src/app/(advertiser)/billing/page.tsx:6-9` (local BalanceData interface)
- `apps/web/src/app/(dashboard)/earnings/page.tsx:6-13` (local EarningsSummary interface)

Each page defines its own interface that may (and does, see BUG-01) drift from the actual API response shape. The shared package already has the correct types.

**Fix**: Import types from `@ad-me/shared` in the web app. Ensure the API response matches the shared types.

---

### ARCH-03: formatINR and StatusBadge duplicated across pages

**Files**:
- `apps/web/src/app/(advertiser)/campaigns/page.tsx:18-20,22-34`
- `apps/web/src/app/(advertiser)/campaigns/[id]/page.tsx:30-32,34-49`
- `apps/web/src/app/(advertiser)/billing/page.tsx:11-13`
- `apps/web/src/app/(dashboard)/earnings/page.tsx:32-34`

`formatINR()` is defined identically in 4 files. `StatusBadge` is defined in 2 files with slightly different color maps.

---

## P3 -- LOW SEVERITY / IMPROVEMENTS

### PERF-01: Admin stats query makes 8 parallel full-table COUNT(*) queries

**File**: `apps/api/src/routes/admin.ts:16-25`

Eight `count(*)` queries run in parallel on every stats page load. At scale, these are full-table scans. Consider materializing counts or using pg_stat_user_tables for approximate counts.

---

### PERF-02: No database indexes on commonly queried foreign keys

**File**: `apps/api/src/db/schema.ts`

Missing indexes on:
- `campaigns.advertiserId` (used in every advertiser's campaign query)
- `ads.campaignId` (used in campaign detail ad listing)
- `adBlocks.surface` + `adBlocks.status` (used in ad-serving auction query -- hot path)
- `earnings.userId` (used in earnings summary/history queries)
- `payouts.userId` (used in payout history)
- `impressions.adBlockId` (used in telemetry click lookup)

These are all queried on every request in their respective routes. Without indexes, every query is a sequential scan.

---

### PERF-03: Billing balance query loads all adBlocks without pagination

**File**: `apps/api/src/routes/billing.ts:97-111`

The "recent transactions" query uses `.limit(20)` which is fine, but joins all campaigns for the advertiser first.

---

### SEC-07: No input length limit on `ctaUrl` field

**File**: `packages/shared/src/schemas/index.ts:51`

`ctaUrl: z.string().url()` has no `.max()` constraint. An attacker could store extremely long URLs in the database, potentially causing display issues or memory problems when serving ads.

---

### SEC-08: Admin role-change endpoint has no self-demotion protection

**File**: `apps/api/src/routes/admin.ts:114-135`

An admin can change their own role to `developer`, locking themselves out of the admin panel. There is no check to prevent the last admin from demoting themselves.

---

### QUALITY-01: Non-null assertion operator (!) used extensively

Multiple files use `authReq.userId!` without null checks. While the auth middleware guarantees `userId` is set, the TypeScript type says `userId?: string`. A safer pattern is to add a `requireUserId()` helper that throws 401 if missing.

---

### QUALITY-02: Error handling in telemetry routes does not wrap in try/catch

**File**: `apps/api/src/routes/telemetry.ts`

Neither the impression nor click handlers have try/catch blocks. Database errors will propagate to the global Express error handler, but the error response will be generic "Internal server error" without any logging of which telemetry call failed.

---

### QUALITY-03: `as any` cast in ad-serving route

**File**: `apps/api/src/routes/ads.ts:11`

```typescript
const result = await getNextAd(surface as any);
```

The validated query result already has the correct type. This should be `surface as AdSurface` or let TypeScript infer it from the validated result.

---

## Scalability Assessment

**At 10x load**: The auction query (ad-serving.ts) hits adBlocks + ads + campaigns with no index on surface+status. Response times will degrade. Rate limiter is in-memory (express-rate-limit), so it does not work across multiple API instances.

**At 100x load**: The 8 parallel COUNT(*) queries in admin stats will cause lock contention. The earnings summary computes SUM() on every request without materialized views. The balance race condition (SEC-01) becomes a guaranteed data integrity issue.

**At 1000x load**: Full-table scans on unindexed columns become untenable. The in-memory rate limiter is completely ineffective across instances. Need Redis-backed rate limiting, read replicas, and materialized views for aggregations.

---

## Prioritized Remediation Roadmap

### Phase 1: Make the UI work (1-2 hours)
1. **BUG-01**: Fix Campaign interface field names in both campaign pages (`budget`/`spent` not `budgetPaise`/`spentPaise`)
2. **BUG-02**: Fix billing deposit payload (`amount` not `amountPaise`)
3. **BUG-04**: Fix earnings history response key (`earnings` not `events`/`history`)
4. **BUG-09**: Fix campaign delete to use DELETE endpoint or add `completed` to updateCampaignSchema

### Phase 2: Make the business logic correct (2-4 hours)
5. **BUG-03**: Add advertiser profile creation flow (registration endpoint or auto-create)
6. **BUG-05**: Track campaign.spent by incrementing it in telemetry/impression handler
7. **BUG-06**: Track users.lifetimeEarned by incrementing it in telemetry handlers
8. **BUG-07**: Mark adBlocks as exhausted when impressionsServed >= impressionsTotal
9. **BUG-08**: Fix impressionId flow (either use ad-serving ID or don't return one)

### Phase 3: Security hardening (2-3 hours)
10. **SEC-01**: Move balance check into transaction with SELECT FOR UPDATE
11. **SEC-02**: Configure CORS with explicit allowed origins
12. **SEC-04**: Implement token refresh in web client (401 interceptor + retry)
13. **SEC-05**: Fail-closed on missing webhook secret in production

### Phase 4: Code quality (1-2 hours)
14. **ARCH-01**: Extract advertiser lookup into middleware/helper
15. **ARCH-02**: Use shared types in frontend instead of local interfaces
16. **ARCH-03**: Extract formatINR, StatusBadge into shared components
17. **PERF-02**: Add database indexes on FK columns

---

## Long-term Maintainability Concerns

1. **The frontend-backend contract is not enforced**: Local TypeScript interfaces in each page file will drift again. Use the shared package types or generate them from the API.

2. **No automated tests**: Zero test files detected. Any refactoring risks introducing regressions that will not be caught.

3. **Financial calculations without consistency**: Campaign budget tracking (spent), developer earnings (lifetimeEarned), and advertiser balance are all updated in different places with no reconciliation. A financial audit would find discrepancies.

4. **No token refresh = forced re-login every 15 minutes**: Users will think the app is broken.

5. **Advertiser onboarding gap**: The most critical user journey (signup -> become advertiser -> create campaign -> create ad -> place bid) is broken at step 2 with no path to create an advertiser profile.

---

## Obstacles Encountered

- No `.env` file was committed to git (confirmed by `git ls-files`), though the `.env` exists locally on disk. The `.env.example` uses placeholder values.
- No test files exist anywhere in the monorepo, so no tests could be run to verify behavior.
- The `apps/web/src/app/(developer)` route group does not exist -- developers are served by the `(dashboard)` group instead.
- No login page exists at `/app/login/page.tsx` -- it is at `/(auth)/login/page.tsx` instead.
