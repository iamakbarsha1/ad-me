# ad-me: M2 Ad Serving Core

## M1 — DONE (2 commits on main)

## M2 Tasks

### 1. API: Ad serving service + GET /ads/next
- [x] Create ad-serving.ts — auction: active blocks -> highest bid -> earliest tiebreak
- [x] Implement GET /ads/next with surface query param
- [x] Return AdServeResponse (ad + blockId)

### 2. API: Killswitch endpoint (real)
- [x] Read killswitch table, return { enabled, reason }

### 3. API: Telemetry endpoints (impression + click)
- [x] POST /telemetry/impression — idempotent, increment block served, create earning
- [x] POST /telemetry/click — idempotent, create earning at 50x rate

### 4. Extension: Claude Code terminal spinner adapter
- [x] Detect spinner patterns in active terminal (onDidWriteTerminalData + fallback poll)
- [x] Fire onThinkingStart/onThinkingEnd callbacks (2s debounce)

### 5. Extension: 4 ad surfaces
- [x] SpinnerOverlaySurface — WebviewView panel with HTML ad renderer
- [x] ThinkingShimmerSurface — animated status bar with dot cycling
- [x] StatusBarAdSurface — updated to AdServeResponse interface
- [x] SpinnerVerbSurface — "Thinking... powered by" status bar

### 6. Extension: Prefetch + lifecycle wiring
- [x] On activate: prefetch all surfaces
- [x] On thinking start: show ad, start impression tracking
- [x] On thinking end: hide ad, cancel tracking
- [x] Wire killswitch poller to ApiClient

### 7. Seed data script
- [x] seed.ts — test advertiser, campaign, 4 ads, ad blocks, killswitch row (13 rows seeded)

## Verification
- [x] Typecheck passes (all 5 packages)
- [x] Seed script runs against Neon DB
- [ ] GET /ads/next returns ad per surface (needs running server)
- [ ] Killswitch returns status (needs running server)
