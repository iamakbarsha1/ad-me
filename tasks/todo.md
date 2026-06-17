# ad-me: M3 Advertiser Portal + Billing

## M1 — DONE
## M2 — DONE (f018567)

## M3 Tasks

### API: Campaign CRUD
- [x] GET /campaigns — list campaigns for authenticated advertiser
- [x] GET /campaigns/:id — get single campaign with ads count
- [x] POST /campaigns — create campaign (advertiser role)
- [x] PATCH /campaigns/:id — update campaign name/status/budget/endDate
- [x] DELETE /campaigns/:id — soft delete (set status=completed)

### API: Ad creation + management
- [x] POST /campaigns/:campaignId/ads — create ad for campaign
- [x] GET /campaigns/:campaignId/ads — list ads for campaign

### API: Auction bid
- [x] POST /auction/bid — validate floor price, check balance, deduct, create ad_blocks

### API: Billing
- [x] POST /billing/deposit — mock Dodo checkout (TODO: real integration)
- [x] GET /billing/balance — return advertiser balance + recent debits

### API: Earnings
- [x] GET /earnings/summary — today/month/lifetime for authenticated user
- [x] GET /earnings/history — paginated earnings list with type filter

### API: Payouts
- [x] GET /payouts — list payout history
- [x] POST /payouts/request — validate min threshold, create payout record
- [x] PUT /payouts/settings — update UPI/bank payout details

### API: Webhooks
- [x] POST /webhooks/dodo — handle payment.completed + payout.completed (signature TODO)

### Web: Advertiser Portal
- [x] Campaigns list page with create/edit/pause actions
- [x] Campaign detail page with ads list
- [x] Ad creation form with surface preview
- [x] Billing page — deposit form + balance display

### Web: Developer Dashboard
- [x] Earnings page — summary cards + daily/monthly history table
- [x] Payouts page — request form + history table + settings section

### Web: Shared
- [x] Enhanced API client with auth token helpers
- [x] Advertiser layout with auth guard (require advertiser role)

## Verification
- [x] Typecheck passes (all 5 packages)
- [ ] Runtime test with running API server
- [ ] Dodo Payments real integration (deferred — needs API keys)
- [ ] Webhook signature verification (deferred — needs Dodo SDK)
