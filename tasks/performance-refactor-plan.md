# CarShowScout Performance Refactor Plan

**Source audit:** `tasks/performance-audit.md` (2026-05-31)  
**Status:** Planning only — no application code or migrations in this document.  
**Principles:** Small commits, reviewable diffs, no broad rewrites, preserve UI unless required.

---

## Overview

This plan turns audit findings into **seven implementation phases**, ordered to reduce launch risk. Each phase is designed to ship independently, deploy safely, and roll back without cascading failures.

| Phase | Audit item | Theme | Separate commit? |
|-------|------------|-------|------------------|
| 1 | P0-1 | Indexed guest vehicle lookup | Yes (2 commits: schema+backfill, then read path) |
| 2 | P1-6 | Supporting DB indexes | Yes |
| 3 | P0-2 | Public endpoint rate limits | Yes |
| 4 | P0-3 | Async registration side effects | Yes |
| 5 | P0-4 | Organizer registration pagination | Yes (2 commits: API, then page) |
| 6 | P0-5 | Dash-card print improvements | Yes — **Complete** |
| 7 | P0-6 | Observability + route timing | Yes — **Complete** |

**Deferred (post-launch or needs review):** P1-1 public events pagination, P2-1 ISR/caching layer, trigram search on `Event.name`, middleware matcher narrowing, full async PDF dash cards. Marked **needs review** where product or infra decision is unresolved.

---

## Phase 1 — P0-1: Indexed guest vehicle lookup

### Objective
Replace O(n) guest JSON scan in `findVehicleEntryByCode()` with an indexed lookup so QR vote, photo, sale, and SMS paths are constant-time per code.

### Exact files likely involved
- `prisma/schema.prisma` — new lookup model
- `prisma/migrations/*` — migration + optional backfill script
- `scripts/backfill-vehicle-entry-index.ts` (new) — one-time backfill from `RegistrationVehicle` + `Registration.guestVehicles`
- `src/lib/vehicle-entry-lookup.ts` — primary read path
- `src/lib/vehicle-entry-photo.ts` — same fallback pattern today
- `src/lib/event-sms-vehicle-id.ts` — write path when assigning guest `publicVehicleId`
- `src/app/api/events/[id]/register-guest/route.ts` — guest registration transaction
- `src/app/api/events/[id]/register/route.ts` — member registration + vehicle sync
- `src/lib/event-sms-vehicle-id.ts` — `syncRegistrationVehiclesWithPublicIds`, `assignPublicIdsToGuestVehiclePayloads`
- Callers (verify only, minimal changes): `src/app/api/v/[vehicleEntryCode]/vote/route.ts`, `photo/route.ts`, `src/lib/sms/voting-service.ts`, `src/lib/public-vehicle-sale-listing.ts`, `src/app/v/[vehicleEntryCode]/sale/page.tsx`
- Tests: new `src/lib/vehicle-entry-lookup.test.ts`; extend existing vote/sale tests if present

### Current risk
Guest codes miss `RegistrationVehicle.publicVehicleId` unique index. Lookup loads all guest regs for events sharing an SMS prefix and scans JSON (`vehicle-entry-lookup.ts` L169–217). Cost grows with guest count and prefix collisions on event day.

### Proposed change (minimal, no full guest schema rewrite)

**1a — Additive lookup table** (needs review: table name)

```prisma
// Proposed — finalize in implementation PR
model VehicleEntryIndex {
  publicVehicleId       String @unique
  eventId               String
  registrationId        String
  kind                  String // "registration_vehicle" | "guest_json"
  registrationVehicleId String?
  guestVehicleIndex     Int?
  @@index([eventId])
  @@index([registrationId])
}
```

**1b — Backfill** existing rows:
- All `RegistrationVehicle` with non-null `publicVehicleId`
- All guest JSON vehicles with `publicVehicleId` on `Registration.guestVehicles`

**1c — Write path:** upsert `VehicleEntryIndex` inside existing registration `$transaction` blocks whenever a `publicVehicleId` is assigned or updated.

**1d — Read path:** `findVehicleEntryByCode()`:
1. Query `VehicleEntryIndex` by `publicVehicleId` (indexed unique)
2. Load full entry via existing builders (RV include or guest JSON slice)
3. **Temporary fallback:** keep current prefix+JSON scan behind env flag `VEHICLE_ENTRY_LOOKUP_FALLBACK=true` for one release, then remove

**Not in scope for Phase 1:** Redis/Runtime Cache (audit short-term option). Add in Phase 7+ if DB lookup still hot.

### Why this improves scalability
Every QR/SMS/vote/sale lookup becomes one indexed query + one targeted fetch instead of scanning all guest registrations for a prefix.

### Risk level
**Medium** — schema + backfill + dual write/read paths; mitigated by fallback flag and additive table (no drop of guest JSON yet).

### How to test locally
1. `npm run db:migrate` after migration added
2. Run backfill script against dev DB; compare counts: RV with IDs + guest JSON IDs ≈ `VehicleEntryIndex` row count
3. Manual: guest-register a vehicle → note `publicVehicleId` on dash card / JSON → open `/v/{code}/sale`, vote page, photo URL
4. Unit tests: lookup by member RV code, guest code, invalid code, case normalization
5. Regression: existing member vehicle codes still resolve via fast path

### How to test after deployment
1. `npm run db:migrate:deploy` on production before app deploy (or same release with migration first)
2. Run backfill on production (idempotent upsert)
3. Spot-check 3 known guest codes + 3 member codes in production
4. Monitor p95 on `/api/v/*/photo`, sale page, vote POST (Phase 7 timing helps)
5. After 48h with zero fallback hits in logs, disable `VEHICLE_ENTRY_LOOKUP_FALLBACK`

### Rollback plan
- Redeploy previous app version (lookup table unused if read path reverted)
- Lookup table is additive — no need to drop for rollback
- If bad data in index: truncate `vehicle_entry_index` and re-run backfill; reads still work via fallback flag

### Schema / migration impact
**Yes** — new model + migration; backfill script (not auto-run in migrate unless embedded as SQL). No changes to `guestVehicles` JSON shape.

### Separate commit?
**Two commits recommended:**
1. `feat: add VehicleEntryIndex schema, backfill script, write-path upserts` — **Phase 1A (implemented)**
2. `feat: use VehicleEntryIndex in findVehicleEntryByCode with fallback` — **Phase 1B (implemented)**

---

### Phase 1A — implementation status (2026-05-31)

**Read path:** **Not switched.** `findVehicleEntryByCode()` in `src/lib/vehicle-entry-lookup.ts` still uses `RegistrationVehicle.publicVehicleId` unique lookup + guest JSON prefix scan. No references to `VehicleEntryIndex` in read paths.

**Migration:** `20260531140000_vehicle_entry_index`

**Schema:** `VehicleEntryIndex` model with `publicVehicleId` (unique), `eventId`, `registrationId`, `entryType` (`REGISTRATION_VEHICLE` | `GUEST_JSON`), optional `registrationVehicleId` (unique), optional `guestVehicleIndex`. Indexes on `eventId`, `registrationId`. No PII stored.

**Files changed (Phase 1A):**
- `prisma/schema.prisma` — `VehicleEntryIndex` model + relations on `Event`, `Registration`, `RegistrationVehicle`
- `prisma/migrations/20260531140000_vehicle_entry_index/migration.sql`
- `src/lib/vehicle-entry-index.ts` — normalize, parse, build, upsert, sync, backfill helpers
- `src/lib/vehicle-entry-index.test.ts` — member/guest rows, idempotent upsert, malformed JSON
- `src/lib/event-sms-vehicle-id.ts` — sync index on RV create/repair/guest JSON backfill
- `src/app/api/events/[id]/register-guest/route.ts` — sync after guest create
- `src/app/api/events/[id]/registrations/[registrationId]/route.ts` — sync after guest PATCH
- `src/app/api/registrations/[id]/claim/route.ts` — sync after claim converts guest → member RVs
- `scripts/backfill-vehicle-entry-index.ts` — idempotent CLI backfill

**Write paths wired:** member registration (`syncRegistrationVehiclesWithPublicIds`, `replaceAllRegistrationVehiclesWithPublicIds`), legacy RV repair, guest JSON ID backfill, guest register, guest organizer PATCH, claim.

**Backfill commands:**
```bash
# Dry run (no writes; reports counts only)
npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts --dry-run

# Apply (idempotent; safe to rerun)
npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts
```

**Remaining risks (Phase 1A):**
- Index may drift if a code path assigns `publicVehicleId` without calling sync (mitigated by backfill + forward writes on known paths).
- Cross-registration code collision skips upsert (`skippedRecords` in backfill stats); existing unique constraints on `RegistrationVehicle.publicVehicleId` should prevent new collisions.
- Table is unused by reads until Phase 1B — zero user-facing behavior change until then.
- Production deploy order: run migration, deploy app (writes begin), run backfill for historical rows.

**Verification (Phase 1A):**
- `prisma validate` — pass
- `prisma generate` — pass
- `eslint` on changed files — pass
- `npm run build` — pass
- `vitest run src/lib/vehicle-entry-index.test.ts` — 7 tests pass
- Repo-wide `npx tsc --noEmit` — **pre-existing failures only** in `registration-vehicle-classes.test.ts` and `site-url.test.ts` (unrelated to Phase 1A; not fixed in this pass)

**Phase 1B:** implemented — see **Phase 1B — implementation status** below.

### Phase 1B — implementation status (2026-05-31)

**Read path:** **Switched with fallback.** `findVehicleEntryByCode()` queries `VehicleEntryIndex` by `publicVehicleId` first, then falls through to legacy `RegistrationVehicle` lookup + guest JSON prefix scan on miss/stale.

**Feature flag:** `VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED` — enabled by default (`true` when unset). Set to `false`, `0`, `no`, or `off` to disable indexed lookup and use legacy paths only.

**Files changed (Phase 1B):**
- `src/lib/vehicle-entry-lookup.ts` — indexed resolve, legacy extract, perf lookup paths
- `src/lib/vehicle-entry-lookup.test.ts` — indexed member/guest, miss, stale, flag disabled
- `.env.example` — documents `VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED`

**Callers (unchanged):** vote, photo, judge-score routes; sale pages; `public-vehicle-sale-listing.ts`; `sms/voting-service.ts`; `ensure-dash-card-vehicle-qrs.ts`

**Perf lookup paths:**
- `vehicle_entry_index_member` — index hit, member RV resolved
- `vehicle_entry_index_guest` — index hit, guest JSON slice resolved
- `vehicle_entry_index_miss` — no index row; legacy attempted
- `vehicle_entry_index_stale_fallback` — index row stale; legacy attempted and failed (or legacy succeeded with legacy path logged instead)
- Legacy paths unchanged: `registration_vehicle`, `guest_scan`, `prefix_miss`, `invalid`, `not_found`

**Rollout notes:**
1. Deploy after Phase 1A migration + backfill are applied in target environment.
2. Monitor `lookupPath` in perf logs; `vehicle_entry_index_miss` / `vehicle_entry_index_stale_fallback` should be rare if writes + backfill are healthy.
3. Emergency rollback: set `VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED=false` (no redeploy of schema needed).

**Verification commands:**
```bash
npm run test -- src/lib/vehicle-entry-lookup.test.ts
npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts --dry-run
npm run build
```

---

## Phase 2 — P1-6: Supporting database indexes

### Objective
Add low-risk btree indexes identified in the audit to speed organizer lists, registration loads, inbox, and dashboard queries.

### Exact files likely involved
- `prisma/schema.prisma`
- `prisma/migrations/*`
- Optional: `src/lib/dashboard-managing-events.ts` — verify raw SQL still benefits (may simplify later; not required in this phase)

### Current risk
FK lookups and filtered lists scan more rows than necessary as data grows (`RegistrationVehicle` by `registrationId`, organizer filter by `eventId+status`, inbox sort by `createdAt`).

### Proposed change
Add indexes only (no query rewrites):

| Model | Index |
|-------|-------|
| `RegistrationVehicle` | `@@index([registrationId])` |
| `Registration` | `@@index([eventId, status])` |
| `Message` | `@@index([recipientUserId, createdAt])` |
| `EventStaffMember` | `@@index([userId])` |
| `OrganizationMember` | `@@index([orgId])` |
| `VehicleSaleInquiry` | `@@index([eventId, status])` |

**Defer (needs review):**
- `Registration @@index([status])` alone — low priority until admin cross-event reports exist
- `VehicleJudgeScore @@index([eventId, judgeUserId])` — add when judge UI traffic confirmed
- `Event.name` trigram (raw SQL) — separate phase after `/events` pagination

### Why this improves scalability
Cheaper joins and filtered `findMany` on hot paths; index creation online on Postgres/Supabase is non-blocking for read traffic.

### Risk level
**Low** — additive indexes only; no application logic change.

### How to test locally
1. Migrate dev DB
2. `npm run test` — full suite
3. Smoke: organizer registrations page, messages inbox, registration edit, sale inquiry stats
4. Optional: `EXPLAIN ANALYZE` on organizer registration query before/after (staging)

### How to test after deployment
1. `npm run db:migrate:deploy` before or with deploy
2. Supabase → Database → query performance: confirm index use on slow queries
3. No functional regression expected — spot-check organizer registrations + messages

### Rollback plan
- App rollback independent of indexes (indexes harmless if unused)
- To remove indexes: new migration `DROP INDEX` (only if proven harmful — unlikely)

### Schema / migration impact
**Yes** — single migration, no data backfill.

### Separate commit?
**Yes** — one commit: `perf: add btree indexes for registration and messaging hot paths`

### Phase 2 — implementation status (2026-05-31)

**Status:** Implemented — additive btree indexes only; no application code changes.

**Migration:** `20260531150000_supporting_btree_indexes`

**Indexes added:**

| Model | Index | Type | Justified by |
|-------|-------|------|--------------|
| `RegistrationVehicle` | `[registrationId]` | single | `findMany` / `deleteMany` / includes by registration on registration detail, vehicle sync, dash cards, sale listings (`event-sms-vehicle-id.ts`, `sync-vehicle-sale-listings.ts`, `dash-cards-for-registrations.ts`) |
| `Registration` | `[eventId, status]` | compound | `loadEventRegistrationSummaries()` filters `eventId` + `status: { not: "CANCELLED" }` (`event-registration-summary.ts`); organizer dashboard aggregates |
| `Message` | `[recipientUserId, createdAt DESC]` | compound | Inbox queries filter recipient + `orderBy: { createdAt: "desc" }` (`dashboard/messages/page.tsx`, `api/messages/route.ts`); complements existing `[recipientUserId]` |
| `EventStaffMember` | `[userId]` | single | Dashboard managing-events loads staff rows by `userId` (`dashboard-managing-events.ts`, `event-staff.ts`) |
| `VehicleSaleInquiry` | `[eventId, status]` | compound | Organizer stats count by `eventId` + status filter (`event-sale-inquiry-stats.ts`) |

**Write overhead:** Minor — each index adds index maintenance on INSERT/UPDATE/DELETE for the indexed columns. Low-cardinality filters (`status`) on scoped parents (`eventId`) keep overhead acceptable pre-launch.

**Skipped (not justified by current queries):**

| Recommendation | Reason skipped |
|----------------|----------------|
| `OrganizationMember @@index([orgId])` | All member queries filter by `userId` or `userId_orgId` composite; no `findMany({ where: { orgId } })` in codebase |
| `Registration @@index([status])` alone | Cross-event admin reports not implemented; deferred in audit |
| `VehicleJudgeScore @@index([eventId, judgeUserId])` | Judge UI traffic unconfirmed; deferred in audit |
| `RegistrationVehicle @@index([eventCategoryId])` | No queries filter RV rows by category alone |
| Stripe session/intent indexes | `stripeCheckoutSessionId` / `stripePaymentIntentId` already `@unique` |

**Verification commands:**
```bash
node --env-file=.env.local ./node_modules/.bin/prisma validate
npm run db:generate
node --env-file=.env.local ./node_modules/.bin/prisma migrate status
node --env-file=.env.local ./node_modules/.bin/prisma migrate deploy   # production / when ready
npm run build
npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts --dry-run
```

**Files changed:**
- `prisma/schema.prisma`
- `prisma/migrations/20260531150000_supporting_btree_indexes/migration.sql`
- `tasks/performance-refactor-plan.md`

---

## Phase 3 — P0-2: Public endpoint rate limits

### Objective
Protect high-risk public write endpoints from abuse without changing successful request behavior for normal users.

### Exact files likely involved
- `src/lib/rate-limit.ts` (new) — shared helper, mirror pattern of `vehicle-sale-inquiry-rate-limit.ts`
- `src/app/api/events/[id]/register-guest/route.ts`
- `src/app/api/events/[id]/register/route.ts`
- `src/app/api/v/[vehicleEntryCode]/vote/route.ts`
- Optional same phase: `src/app/api/events/[id]/register-guest/upload/route.ts`
- `.env.example` — document `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` **or** note Vercel Firewall-only approach
- Tests: `src/lib/rate-limit.test.ts`

### Current risk
Guest registration, voting, and member registration can be spammed; only sale inquiry has DB-backed rate limits today.

### Proposed change

**Option A (preferred if Upstash available):** Sliding-window rate limit via Upstash Redis REST (serverless-friendly), keyed by IP hash + route:

| Endpoint | Suggested limit | Notes |
|----------|-----------------|-------|
| `POST register-guest` | 10 / IP / hour | Per eventId optional stricter cap |
| `POST register` (auth) | 30 / user / hour | Use user id when authenticated |
| `POST vote` | 60 / IP / hour | Business dedup still applies |
| `POST register-guest/upload` | 20 / IP / hour | Needs review |

**Option B (no new infra):** Vercel Firewall rate limit rules on same paths — config-only, document in repo README/deploy notes.

**Not in Phase 3:** Twilio inbound (Twilio signature + carrier limits; add idempotency in later phase). CAPTCHA on guest register — **needs review** if abuse observed.

Return `429` with JSON `{ error: "..." }` matching existing API style.

### Why this improves scalability
Caps connection churn, DB writes, SendGrid/R2 load from bots during registration/voting spikes.

### Risk level
**Medium** — false positives for shared IPs (schools, venues); limits should be conservative initially.

### How to test locally
1. Without Redis: mock rate-limit helper to always allow in dev (`NODE_ENV=development` bypass)
2. With Upstash dev instance: script 11 guest registers from same IP → expect 429 on 11th
3. Verify legitimate single registration still 200/201
4. Vote: exceed limit → 429; same visitor still blocked by existing cookie dedup

### How to test after deployment
1. Staging load: 20 rapid guest POSTs → some 429, no 5xx
2. Production: monitor 429 rate vs 5xx; adjust limits if support tickets
3. Confirm sale inquiry limits unchanged

### Rollback plan
- Remove rate-limit calls from routes (one commit revert)
- Or disable via env `RATE_LIMIT_ENABLED=false`
- Vercel Firewall: disable rule in dashboard

### Schema / migration impact
**None** (unless Option A stores counters only in Redis).

### Separate commit?
**Yes** — `feat: rate limit guest registration and public voting endpoints`

### Phase 3 — implementation status (2026-05-31)

**Status:** Implemented — in-memory sliding-window rate limits on four public write endpoints. No schema changes. Sale inquiry DB limits and organizer OTP limits unchanged.

**Approach:** Module-scoped in-memory store (per serverless instance). Hashed keys, 429 JSON for API routes. No new Redis/Upstash dependency.

**Feature flag:** `PUBLIC_RATE_LIMIT_ENABLED` — enabled when unset. Set `false`, `0`, `no`, or `off` to disable all Phase 3 limits.

**Endpoints protected:**

| Endpoint | Limit (default) | Key strategy | Limited response |
|----------|-----------------|--------------|------------------|
| `POST register-guest` | 10 / 10 min | `guest-register:{eventId}:{ipHash}` | 429 + `Retry-After` |
| `POST register` | 10 / 10 min | `member-register:{eventId}:{userId}` | 429 + `Retry-After` |
| `POST vote` | 30 / 1 min | `web-vote:{codePrefix}:{ipHash}` | 429 + `Retry-After` |
| `POST twilio/inbound` | 30 / 10 min | `twilio-inbound:{phoneHash\|sidHash\|ipHash}` | 200 TwiML (no 429 — avoids Twilio retries) |

**Not modified:** sale inquiry (`vehicle-sale-inquiry-rate-limit.ts`), organizer OTP (`step-up-otp.ts`), `register-guest/upload`.

**Rollback:** Set `PUBLIC_RATE_LIMIT_ENABLED=false` and redeploy.

**Event-day risk:** Shared venue Wi‑Fi may share one IP. Monitor `rateLimit: true` logs; relax via `PUBLIC_RATE_LIMIT_*_LIMIT` / `_WINDOW_MS` env overrides.

**Files changed:** `src/lib/rate-limit.ts`, `src/lib/rate-limit.test.ts`, four API routes, `.env.example`.

**Verification:**
```bash
npm run test -- src/lib/rate-limit.test.ts
npm run build
```

---

## Phase 4 — P0-3: Async registration side effects

**Status:** Complete

### Objective
Return registration API responses immediately after DB commit; move staff-photo R2 sync and confirmation email off the critical path.

### Side effects moved off response path (background via `after()`)
| Side effect | Route(s) | Notes |
|-------------|----------|-------|
| `syncAllRegistrationStaffPhotos` | member register, guest register | R2 copy of registrant/vehicle photos for staff dash cards |
| `notifyRegistrationConfirmationEmail` | member register, guest register | SendGrid confirmation (already never-throws internally) |

Both run in parallel inside `runRegistrationPostSubmitSideEffects()` after the registration transaction commits.

### Side effects left synchronous (and why)
| Step | Route(s) | Why critical |
|------|----------|--------------|
| Rate limit check | member, guest | Must reject before any DB work |
| Validation / tier / category checks | member, guest | Business rules |
| `$transaction` (registration, vehicles, sale listings, VehicleEntryIndex for guest) | member, guest | Data integrity |
| SMS consent user profile update | member only | Persists opt-in before user leaves flow |
| Stripe org lookup for `checkoutRequired` | member, guest | Required response field for payment UI |

**Not changed:** `registrations/[registrationId]/route.ts` PATCH still syncs staff photos inline (edit flow, out of Phase 4 POST scope).

### Implementation
- **New:** `src/lib/registration-post-submit.ts` — `scheduleRegistrationPostSubmitSideEffects()` uses Next.js `after()` (built-in, no `@vercel/functions` dependency)
- **Flag:** `REGISTRATION_POST_SUBMIT_BACKGROUND` (default enabled). Set `false` to restore synchronous awaits for rollback
- **Logging:** `[registration-post-submit]` with `route`, `eventId`, `registrationId`, `sideEffect`, `durationMs`, `success` — no PII
- **Error isolation:** Each side effect wrapped in try/catch; failures logged, never fail registration response
- **No duplicate emails:** Single schedule call per successful registration POST; email helper unchanged

### Exact files changed
- `src/lib/registration-post-submit.ts` (new)
- `src/lib/registration-post-submit.test.ts` (new)
- `src/app/api/events/[id]/register/route.ts`
- `src/app/api/events/[id]/register-guest/route.ts`
- `.env.example`

### Rollback strategy
1. **Quick:** Set `REGISTRATION_POST_SUBMIT_BACKGROUND=false` — routes await side effects before response (pre-Phase 4 behavior)
2. **Full revert:** Restore `await syncAllRegistrationStaffPhotos` + `await notifyRegistrationConfirmationEmail` in both register routes; remove helper imports

### Verification
```bash
npm run test -- src/lib/registration-post-submit.test.ts
npm run build
npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts --dry-run
```

Manual: register as guest and member — response returns before email/R2 work; email still arrives; staff photos appear within seconds.

### Risk level (residual)
**Low–medium** — Brief delay before dash-card staff photos if viewed immediately after register; `after()` on Vercel keeps work in same invocation (unlike fire-and-forget without `after()`).

### Separate commit
**Yes** — `perf: defer registration email and staff photo sync from response path`

---

### Original plan notes (reference)

### Exact files likely involved
- `src/app/api/events/[id]/register/route.ts` — L376–382 today
- `src/app/api/events/[id]/register-guest/route.ts` — L171–176
- `src/lib/registration-post-submit.ts` (new) — shared background work
- `src/lib/event-registration-staff-photos.ts` — `syncAllRegistrationStaffPhotos`
- `src/lib/email/notify-registration-confirmation-email.ts`
- `src/app/api/events/[id]/registrations/[registrationId]/route.ts` — check PATCH path for same pattern
- Vercel: use `@vercel/functions` `waitUntil()` if no job queue yet

### Current risk
Users wait for SendGrid + N× R2 copies before JSON response; ties up serverless concurrency during registration spikes.

### Proposed change (minimal — no new job platform required for v1)

1. After successful `$transaction`, return `NextResponse.json(...)` **first**
2. Schedule side effects with `waitUntil(Promise.all([syncPhotos, sendEmail]))` so response flushes before work completes but work still runs in same invocation
3. **Better v1.1 (same phase if straightforward):** move staff-photo sync to **lazy** — only on dash-card load or staff-photo view route (reduces duplicate work with Phase 6). **Needs review:** confirm dash cards still show photos if sync delayed (photos may appear after first view)

**Explicit non-goals:** Changing email content, changing registration transaction boundaries, UI changes.

**Error handling:** Log failures in post-submit; do not fail registration response. Optional: Sentry capture in Phase 7.

### Why this improves scalability
Shorter request duration → higher effective throughput on serverless; fewer timed-out registrations under load.

### How to test locally
1. Register (member + guest) — response returns quickly (< 1s without waiting for email)
2. Confirm email still arrives (SendGrid configured)
3. Confirm staff photos appear on registration detail / dash card within seconds
4. Simulate SendGrid failure — registration still succeeds, error logged

### How to test after deployment
1. Time registration POST p95 (should drop vs baseline)
2. Verify confirmation emails received for test registrations
3. Organizer dash-card preview for new registration — photos present

### Schema / migration impact
**None**

---

## Phase 5 — P0-4: Organizer registration pagination

**Status:** Complete

### Objective
Load organizer registration lists in pages server-side instead of fetching entire events into memory and filtering in the browser.

### Pagination strategy
- **Offset pagination** via Prisma `skip` / `take` with deterministic `orderBy`
- **URL-driven state:** `?page=1&pageSize=50&sort=name&sortDir=asc&status=...&tier=...`
- **Default page size:** 50
- **Max page size:** 100 (clamped in `parseOrganizerRegistrationsSearchParams`)
- Invalid `page` defaults to 1; page beyond last page clamps to last page (no crash)
- Filters and sort update URL → full SSR navigation via `router.push`

### Side effects moved / deferred
| Item | Phase 5 behavior |
|------|------------------|
| Registration list load | Paginated — one page per request |
| Status / tier filters | Server-side `where` (status labels mapped to Prisma OR clauses) |
| Sort (name, email, tier, status, cars) | Server-side `orderBy` |
| Sort (fee, collected, due) | **Current page only** — computed money columns sorted client-side on visible rows |
| Table subtotals | **Current page only** (footer labeled "Page subtotals") |
| CSV export | **Unchanged** — still full dataset via `/api/events/[id]/registrations/export` (Phase 5b streaming optional) |
| Bulk actions / dash cards | Unchanged — operate on selected rows on current page |

### Files changed
- `src/lib/organizer-registrations-list-query.ts` (new) — parse URL params, build where/orderBy, query string helper
- `src/lib/organizer-registrations-list.ts` (new) — paginated Prisma loader + row mapping
- `src/lib/organizer-registrations-list.test.ts` (new) — param parsing, clamp, where builder
- `src/app/organizer/events/[id]/registrations/page.tsx` — uses `loadOrganizerRegistrationsPage`, `searchParams`
- `src/components/organizer/organizer-registrations-client.tsx` — URL-driven filters/sort, Previous/Next pagination

### Performance timing
`page.organizer.registrations.load` now logs:
- `registrationCount` — rows on current page
- `totalCount` — registrations matching filters
- `page`, `pageSize`

### Verification
```bash
npm run test -- src/lib/organizer-registrations-list.test.ts
npm run build
```

Manual: visit `/organizer/events/{id}/registrations`, confirm page 1 ≤50 rows, Next/Previous, filters in URL, registration detail links, CSV export, dash-card selection.

### Rollback strategy
Revert `page.tsx` to unbounded `findMany` and restore client-only filter/sort in `organizer-registrations-client.tsx` (remove pagination props and URL navigation). Delete `organizer-registrations-list*.ts` if fully reverting.

### Separate commit
**Yes** — `perf: paginate organizer event registrations list (50 per page)`

---

### Original plan notes (reference)

### Exact files likely involved
- `src/app/organizer/events/[id]/registrations/page.tsx` — remove unbounded `findMany`
- `src/components/organizer/organizer-registrations-client.tsx` — pagination UI, fetch or URL-driven pages
- `src/lib/organizer-registration-rows.ts` — row shaping (reuse)
- `src/app/api/events/[id]/registrations/list/route.ts` (new) **or** server component with `searchParams` page/cursor
- `src/components/organizer/registrations-column-filter.tsx` — move filters to query params
- **Not Phase 5:** `registrations/export/route.ts` — add note "stream in Phase 5b" (**needs review** — may be separate commit)

### Current risk
Events with 500+ registrations cause slow TTFB, large payloads, browser jank on sort/filter.

### Proposed change

**5a — Server-side offset pagination (simplest)**
- Default `pageSize = 50`, URL `?page=1&status=...&q=...`
- Prisma: `where: { eventId, ...filters }`, `orderBy`, `skip`, `take`, separate `count` query for total
- Client: pagination controls; column filters update URL and refetch (or full SSR navigation)

**5b — Export (optional follow-up commit)**
- Keep export unbounded short-term **or** cap with warning — **needs review**
- Ideal: async export job (defer if too large)

**UI behavior:** Pagination controls are acceptable UI change (audit-approved for scale). Preserve existing columns, sort, bulk actions on **current page** or **selected across pages** — **needs review** for bulk select semantics (default: keep bulk on loaded page only to limit scope).

### Why this improves scalability
Bounded query size and HTML payload regardless of event size.

### Risk level
**Medium** — filter/sort parity with current client behavior; bulk actions edge cases.

### How to test locally
1. Seed event with 100+ registrations (or use existing large event)
2. Page 1 / Page 2 navigation; filters reduce count
3. Sort by name, status, payment — matches previous ordering for same data
4. Bulk cancel on page — works; document if cross-page bulk deferred

### How to test after deployment
1. Organizer opens large event registrations — page loads < 3s
2. Check-in workflow on event day with real organizer account

### Rollback plan
- Revert to full `findMany` in page component (restore previous behavior)

### Schema / migration impact
**None** (Phase 2 index `[eventId, status]` helps this query)

### Separate commit?
**Yes — two commits:**
1. `feat: paginated API/query for organizer registrations`
2. `feat: wire organizer registrations UI to server pagination`

---

## Phase 6 — P0-5: Dash-card print async / batch improvements

**Status:** Complete (2026-05-31)

### Objective
Reduce synchronous work when organizers open dash-card print for many registrations; avoid N× staff-photo sync and unbounded R2 QR uploads on every page load.

### Before (dash-card load path)
1. **`loadDashCardModelsForRegistrations`** — `Promise.all` over every registration id calling **`syncAllRegistrationStaffPhotos`** (R2 copy per registration, blocking).
2. Deep Prisma **`registration.findMany`** with vehicles + guest JSON.
3. Build card models; collect public vehicle codes.
4. **`ensureVehicleQrsForEntryCodes`** — unbounded `Promise.all`: per code **`findVehicleEntryByCode`** + **`ensureVehicleQrForEntry`** (R2 upload + DB persist when missing).
5. **`attachSaleQrsToDashCards`** — unbounded `Promise.all`: **`ensureVehicleSaleQrForStorage`** (R2 upload per sale listing).

### After (dash-card load path)
1. **No eager staff-photo sync** — rely on Phase 4 post-registration background sync, organizer PATCH sync, or lazy staff-photo view routes. Cards use existing `eventPhotoObjectKey` / staff-photo view URLs / http legacy URLs / placeholders.
2. Same Prisma load; while building cards, collect **prefetched `vehicleQrUrl`** from member `RegistrationVehicle` rows.
3. **`ensureVehicleQrsForEntryCodes`** (bounded concurrency **10**):
   - **Skipped** when prefetched R2 URL exists for code (`qrSkippedCount`).
   - **Ensured** inline SVG data URL only when missing (`resolveVehicleQrUrlForDashCard`) — **no R2 upload or DB write** on dash-card path (`qrEnsuredCount`).
   - Individual failures logged; load continues (`qrFailureCount`).
4. **`attachSaleQrsToDashCards`** (bounded concurrency **10**): inline SVG sale QRs only via **`resolveVehicleSaleQrUrlForDashCard`** — no R2 upload on print load.

### Operations classification

| Operation | Before | After |
|-----------|--------|-------|
| Staff photo R2 sync per registration | Blocking eager | **Skipped** on dash-card load |
| Staff photo view URL resolution | Critical | **Critical** (unchanged) |
| Vote QR — existing R2 URL | Re-lookup + skip upload | **Skipped** via prefetch (`qrSkippedCount`) |
| Vote QR — missing URL | R2 upload + DB persist | **Inline SVG only** (bounded batch) |
| Sale QR | R2 upload per card | **Inline SVG only** (bounded batch) |
| Card model shape | Critical | **Unchanged** |
| QR destination URLs | `/v/{code}`, `/v/{code}/sale` | **Unchanged** |

### Performance logging (`dashCards.load`)
Extended metadata (no PII):
- `eventId`, `registrationCount`, `cardCount`
- `qrEnsuredCount`, `qrSkippedCount`, `qrFailureCount`
- `staffPhotoSyncSkipped` (count of registrations that would have been synced pre-Phase 6)
- `saleQrEnsuredCount`, `saleQrFailureCount`

### Files changed
- `src/lib/dash-cards-for-registrations.ts` — remove eager sync; prefetch vote QR URLs; extended perf logs
- `src/lib/ensure-dash-card-vehicle-qrs.ts` — prefetch skip + bounded inline ensure
- `src/lib/dash-card-sale.ts` — bounded inline sale QR attach
- `src/lib/vehicle-qr.ts` — `resolveVehicleQrUrlForDashCard`, `resolveVehicleSaleQrUrlForDashCard`
- `src/lib/map-with-concurrency.ts` (new)
- `src/lib/ensure-dash-card-vehicle-qrs.test.ts` (new)
- `src/lib/dash-card-phase6.test.ts` (new)
- `src/lib/vehicle-qr-dash-card.test.ts` (new)
- `src/lib/map-with-concurrency.test.ts` (new)

### Rollback strategy
1. Restore `Promise.all(uniqueRegIds.map(syncAllRegistrationStaffPhotos))` at top of `loadDashCardModelsForRegistrations`.
2. Revert `ensure-dash-card-vehicle-qrs.ts` to use `findVehicleEntryByCode` + `ensureVehicleQrForEntry` (R2 persist path).
3. Revert `dash-card-sale.ts` to `ensureVehicleSaleQrForStorage` with unbounded `Promise.all`.
4. No migration rollback needed.

### Deferred follow-up
- Persist vote/sale QRs to R2 in background when first generated inline (optional dedup across print sessions).
- Full async PDF generation job (product change).

### Verification
```bash
npm run test -- src/lib/ensure-dash-card-vehicle-qrs.test.ts src/lib/dash-card-phase6.test.ts src/lib/map-with-concurrency.test.ts src/lib/vehicle-qr-dash-card.test.ts
npm run build
```

Manual: organizer dash-cards page for an event with 10+ registrations — cards render, vote QRs scan to `/v/{code}`, sale QRs to `/v/{code}/sale`, missing photos show placeholders, logs show `staffPhotoSyncSkipped` and lower `qrEnsuredCount` when URLs prefetched.

### Separate commit
**Yes** — `perf: batch dash-card QR ensure and remove eager staff-photo sync`

---

### Original plan notes (reference)

### Exact files likely involved
- `src/lib/dash-cards-for-registrations.ts` — L229–237 `syncAllRegistrationStaffPhotos` loop
- `src/lib/event-registration-staff-photos.ts`
- `src/lib/ensure-dash-card-vehicle-qrs.ts`
- `src/lib/vehicle-qr.ts`
- `src/lib/dash-card-sale.ts`
- `src/app/organizer/events/[id]/dash-cards/page.tsx`
- `src/components/dash-card/dash-card-preview.tsx` — loading states only if needed

### Current risk
Printing 100+ cards triggers parallel staff-photo sync, deep registration queries, and QR R2 uploads before render.

### Proposed change (incremental — not full PDF rewrite)

**6a — Remove eager sync from load path**
- Delete `Promise.all(uniqueRegIds.map(syncAllRegistrationStaffPhotos))` from `loadDashCardModelsForRegistrations`
- Rely on Phase 4 post-registration sync OR lazy sync when staff-photo view API is first hit
- QR: call `ensureVehicleQrsForEntryCodes` only for codes missing `vehicleQrUrl` (may already partial — verify)

**6b — Batch size limit + progress (minimal UX)**
- If `registrationIds.length > 50`, process QR ensures in chunks of 25 with `Promise.all` per chunk (reduce R2 thundering herd)
- Optional: show server log timing only (no UI change)

**6c — needs review (defer unless required)**
- Full async PDF generation job — product/UX change per audit "Do Not Change Yet"
- Pre-generate all QRs at registration time in background queue

### Why this improves scalability
Dash-card page becomes read-heavy (DB + existing R2 URLs) instead of write-heavy (N syncs + uploads per open).

### Risk level
**Medium** — depends on Phase 4 ensuring photos exist before print; test morning-of-show workflow.

### How to test locally
1. Register vehicles with photos → open dash cards for 10+ registrations — cards render, photos visible
2. Guest vehicles with photos — same
3. Cold registration (photos not synced) — staff photo appears after view route hit or post-submit sync
4. Bulk print 50 cards — page load time vs baseline

### How to test after deployment
1. Organizer prints dash cards for medium event — acceptable load time
2. Verify vote/sale QR codes scan correctly

### Rollback plan
- Restore sync loop at start of `loadDashCardModelsForRegistrations`

### Schema / migration impact
**None**

### Separate commit?
**Yes — up to two commits:**
1. `perf: remove eager staff-photo sync from dash-card loader`
2. `perf: batch QR ensure for large dash-card print sets`

---

## Phase 7 — P0-6: Observability and route timing

**Status:** Complete (2026-05-31)

### Sentry status
**Installed and configured** — `@sentry/nextjs@10.55.0` (Next.js 16 compatible).

- Disabled when `SENTRY_DSN` is unset or `SENTRY_ENABLED=false`
- `next.config.ts` wraps with `withSentryConfig` only when `SENTRY_DSN` is set (build works without DSN)
- Source map upload disabled unless `SENTRY_AUTH_TOKEN` is set
- Conservative defaults: `SENTRY_TRACES_SAMPLE_RATE=0.05`, `SENTRY_PROFILES_SAMPLE_RATE=0`
- `serverExternalPackages: ["@opentelemetry/api"]` for Turbopack/Next 16 stability

### Environment variables (Vercel / `.env.local`)

| Variable | Required | Notes |
|----------|----------|-------|
| `SENTRY_DSN` | For Sentry | Project DSN from Sentry.io — never commit |
| `SENTRY_ENABLED` | No | Set `false` to disable without removing DSN |
| `SENTRY_ENVIRONMENT` | No | Defaults to `VERCEL_ENV` or `NODE_ENV` |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Default `0.05` (5%) |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | Default `0` (off) |
| `SENTRY_ORG` | For source maps | Build-time only |
| `SENTRY_PROJECT` | For source maps | Build-time only |
| `SENTRY_AUTH_TOKEN` | For source maps | Build-time only — never commit |

### Structured log shapes (Vercel stdout — filter by JSON field)

| Filter | Shape | Where |
|--------|-------|-------|
| `"perf":true` | `{ perf, name, durationMs, success, ... }` | Hot routes, lookup, dash cards, organizer registrations |
| `"rateLimit":true` | `{ rateLimit, route, scope, limited, retryAfterSeconds? }` | Public rate limit blocks |
| `"backgroundTask":true` | `{ backgroundTask, name, route, eventId, registrationId, durationMs, success, errorType?, errorMessage? }` | Registration post-submit side effects |
| `"dashCardQr":true` | `{ dashCardQr, kind, codePrefix, errorType, errorMessage }` | Dash-card vote/sale QR failures |
| `"vehicleEntryIndex":true` | `{ vehicleEntryIndex, lookupPath, codePrefix?, eventId?, guestRegCount? }` | Index miss / stale fallback |
| `"observability":true` | `{ observability, source, errorType, errorMessage, ... }` | Twilio inbound / Stripe webhook handler errors |

**Never logged:** names, emails, phones, addresses, payment data, raw Stripe IDs, full vehicle entry codes, Twilio message bodies.

### Sentry error capture (when DSN configured)

| Source | Trigger |
|--------|---------|
| `registration_post_submit` | Side effect failure (staff photos, email, index sync) |
| `dash_card_vote_qr` / `dash_card_sale_qr` | Individual QR generation failure |
| `twilio_inbound_voting` | Unexpected voting handler exception |
| `stripe_webhook` | Unexpected handler exception after signature verified |

**Not captured:** validation 400s, expected 404/403, rate-limit 429s, Twilio signature failures, Stripe signature failures, VehicleEntryIndex anomaly warnings (structured log only — avoids Sentry noise).

### Files changed
- `src/lib/structured-logging.ts` (new) — sanitization + standardized log helpers
- `src/lib/structured-logging.test.ts` (new)
- `src/lib/sentry-observability.ts` (new) — init options + safe `captureObservabilityException`
- `src/lib/sentry-observability.test.ts` (new)
- `sentry.server.config.ts`, `sentry.edge.config.ts` (new)
- `src/instrumentation.ts`, `src/instrumentation-client.ts` (new)
- `next.config.ts` — conditional Sentry wrapper + OpenTelemetry external package
- `package.json` — `@sentry/nextjs`
- `.env.example`
- `src/lib/registration-post-submit.ts` — `backgroundTask` logs + Sentry on failure
- `src/lib/rate-limit.ts` — `limited: true` on rate limit events
- `src/lib/ensure-dash-card-vehicle-qrs.ts`, `src/lib/dash-card-sale.ts` — `dashCardQr` logs + Sentry
- `src/lib/vehicle-entry-lookup.ts` — `vehicleEntryIndex` anomaly warnings
- `src/app/api/sms/twilio/inbound/route.ts` — structured + Sentry on handler errors
- `src/app/api/stripe/webhook/route.ts` — structured + Sentry on handler errors

### Rollback strategy
1. **Quick:** Unset `SENTRY_DSN` or set `SENTRY_ENABLED=false` — no Sentry init, no captures
2. **Full:** Remove `@sentry/nextjs`, revert `next.config.ts`, delete Sentry/instrumentation files
3. Structured logging changes are behavior-preserving and can remain

### Verification
```bash
npm run test -- src/lib/perf-timing.test.ts src/lib/rate-limit.test.ts src/lib/registration-post-submit.test.ts src/lib/structured-logging.test.ts src/lib/sentry-observability.test.ts
npm run test -- src/lib/ensure-dash-card-vehicle-qrs.test.ts src/lib/dash-card-phase6.test.ts src/lib/map-with-concurrency.test.ts src/lib/vehicle-qr-dash-card.test.ts
npm run build   # without SENTRY_DSN
SENTRY_DSN=https://example@sentry.io/1 npm run build   # optional local check
```

### Deferred follow-up
- Sentry alert rules (manual in Sentry dashboard)
- Route timing on sale inquiry POST
- Staging-only Prisma slow-query logging (`PRISMA_LOG_QUERY_MS`)
- Aggregate alerting on repeated `vehicleEntryIndex` anomalies

### Separate commit
**Yes** — `chore: add Sentry and structured observability logging`

---

### Original baseline (2026-05-31) — perf timing layer

#### Implemented (unchanged)

| Component | Location |
|-----------|----------|
| Timing helper | `src/lib/perf-timing.ts` |
| Vehicle entry lookup | `src/lib/vehicle-entry-lookup.ts` |
| Member/guest registration POST | register routes — `withPerfTimingResponse` |
| Web vote POST | vote route |
| Organizer registrations load | registrations page |
| Dash-card generation | `dashCards.load` with Phase 6 metadata |

#### Example perf log

```json
{
  "perf": true,
  "name": "findVehicleEntryByCode",
  "durationMs": 42,
  "success": true,
  "codePrefix": "AXY",
  "lookupPath": "registration_vehicle",
  "guestRegCount": 0,
  "eventId": "uuid"
}
```

---

### Original plan notes (reference)

### Exact files likely involved
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` (new — Sentry Next.js wizard)
- `next.config.ts` — Sentry wrapper if used
- `src/lib/route-timing.ts` (new) — `withRouteTiming(handler)` wrapper
- Hot routes: `register/route.ts`, `register-guest/route.ts`, `vote/route.ts`, `sale/inquiry/route.ts`, `sms/twilio/inbound/route.ts`
- `src/lib/vehicle-entry-lookup.ts` — span or log when fallback scan used
- `.env.example` — `SENTRY_DSN`, optional `SENTRY_ENVIRONMENT`
- `package.json` — `@sentry/nextjs` dev dependency

### Current risk
No structured errors or latency data; incidents discovered via user reports.

### Proposed change

1. **Sentry** — errors + performance transactions on listed routes; release = `VERCEL_GIT_COMMIT_SHA`
2. **Structured route timing** — lightweight `console.info(JSON.stringify({ route, durationMs, status }))` on hot paths (works in Vercel logs even before Sentry)
3. **Prisma slow query log** — staging only: env flag `PRISMA_LOG_QUERY_MS=200`
4. **Alerts (manual setup)** — Sentry alert rules + Vercel deployment notifications (document in plan, not code)

**Not in Phase 7:** Datadog agent, full OpenTelemetry — **needs review** if Sentry insufficient.

### Why this improves scalability
Enables data-driven tuning (limits, indexes, async boundaries) and faster incident response under load.

### Risk level
**Low** — additive; Sentry sampling can stay at 10–20% for performance spans.

### How to test locally
1. `SENTRY_DSN=` empty → no outbound calls
2. With Sentry dev project → throw test error, confirm event received
3. Route timing logs appear in terminal for registration POST

### How to test after deployment
1. Deploy to staging → trigger test error → Sentry event
2. Run k6 Scenario C (registration spike) — compare p95 before/after Phases 1–4
3. Dashboard: register, vote, inquiry transaction names visible

### Rollback plan
- Remove Sentry init files and `withRouteTiming` wrappers
- Unset `SENTRY_DSN` in Vercel env

### Schema / migration impact
**None**

### Separate commit?
**Yes** — `chore: add Sentry and route timing for hot API paths`

---

## Recommended implementation sequence

Execute in order. Complete deploy + verification before starting the next phase unless noted.

```
Phase 2 (indexes) may run immediately after Phase 1 migration deploy — independent of Phase 1 read path.
Phase 3 (rate limits) can parallel Phase 2 if different author; deploy after Phase 2 migrate.
Phase 4 depends on Phase 3 recommended but not strictly required.
Phase 5 depends on Phase 2 index for best results.
Phase 6 depends on Phase 4 (photo sync off critical path).
Phase 7 should start early (Sentry) but full route timing after Phase 4 is ideal baseline.
```

| Order | Phase | Deploy gate |
|-------|-------|-------------|
| 1 | Phase 1 — guest lookup index | Backfill complete; spot-check codes |
| 2 | Phase 2 — DB indexes | `migrate:deploy` OK |
| 3 | Phase 3 — rate limits | 429 behavior verified on staging |
| 4 | Phase 4 — async registration | p95 improved; emails still send |
| 5 | Phase 5 — organizer pagination | Large event tested |
| 6 | Phase 6 — dash-card batch | Organizer print workflow OK |
| 7 | Phase 7 — observability | Timing + Sentry baseline deployed |

**Early win:** Phase 7 **timing baseline** landed before Phase 1 — use Vercel logs to measure refactor impact. Sentry can still be added as **Phase 7b** when ready.

---

## Cursor prompts (one per phase)

### Phase 1 prompt
```
Implement Phase 1 from tasks/performance-refactor-plan.md: add VehicleEntryIndex table with publicVehicleId unique index, backfill script from RegistrationVehicle and guestVehicles JSON, upsert on registration write paths, and update findVehicleEntryByCode to use the index with env-flag fallback to the old JSON scan. No UI changes. Include unit tests. Two commits: schema+backfill+writes, then read path.
```

### Phase 2 prompt
```
Implement Phase 2 from tasks/performance-refactor-plan.md: add Prisma btree indexes on RegistrationVehicle(registrationId), Registration(eventId, status), Message(recipientUserId, createdAt), EventStaffMember(userId), OrganizationMember(orgId), VehicleSaleInquiry(eventId, status). Single migration only, no query changes.
```

### Phase 3 prompt
```
Implement Phase 3 from tasks/performance-refactor-plan.md: add shared rate limiting (Upstash Redis or document Vercel Firewall alternative) for POST /api/events/[id]/register-guest, POST /api/events/[id]/register, and POST /api/v/[vehicleEntryCode]/vote. Match existing 429 JSON error style. Dev bypass when Redis unset. Include tests.
```

### Phase 4 prompt
```
Implement Phase 4 from tasks/performance-refactor-plan.md: return registration JSON immediately after DB transaction in register and register-guest routes; move syncAllRegistrationStaffPhotos and notifyRegistrationConfirmationEmail to waitUntil or equivalent non-blocking path. No UI changes. Log failures without failing the registration response.
```

### Phase 5 prompt
```
Implement Phase 5 from tasks/performance-refactor-plan.md: server-side pagination (50 per page) for organizer event registrations. Add filtered count query using eventId and column filters via URL params. Update organizer-registrations-client.tsx for pagination. Preserve existing columns and sort. Document bulk-action scope. Do not change export route in this pass.
```

### Phase 6 prompt
```
Implement Phase 6 from tasks/performance-refactor-plan.md: remove eager syncAllRegistrationStaffPhotos loop from loadDashCardModelsForRegistrations; batch ensureVehicleQrsForEntryCodes in chunks of 25 for large id sets. Ensure photos still appear when post-registration sync or lazy staff-photo view has run. No PDF/async job UX changes.
```

### Phase 7 prompt (baseline — done)
```
DONE (2026-05-31): Minimal perf timing in src/lib/perf-timing.ts on hot paths listed in Phase 7 Status section.
```

### Phase 7b prompt (Sentry — optional)
```
Implement Phase 7b from tasks/performance-refactor-plan.md: add @sentry/nextjs for error and performance monitoring on register, register-guest, vote, sale inquiry, and twilio inbound routes. Keep existing perf timing logs. Update .env.example. No behavior changes for end users.
```

---

## Items marked “needs review” (do not implement blindly)

| Item | Question to resolve |
|------|---------------------|
| `VehicleEntryIndex` vs other naming | Align with existing `VehicleEntryRecord` types |
| Rate limit storage | Upstash vs Vercel Firewall only |
| Lazy staff-photo sync | Acceptable delay before dash-card print without Phase 6 |
| Organizer bulk select across pages | Product decision |
| CSV export unbounded | Cap, stream, or async job |
| Trigram index on Event.name | Wait for public search pagination (P1-1) |
| Twilio inbound rate limit | May duplicate carrier/Twilio protections |
| Middleware matcher narrowing | Auth regression risk — measure first |

---

## Post-launch backlog (from audit, not in seven phases)

- P1-1 — Public `/events` pagination + default `to` date in query
- P1-2 — Scope `getRegisteredEventStatusMapForUser` to visible events
- P1-3 — Async sale inquiry email
- P1-7 — Cache `getPlatformFee()`
- P1-8 — Reduce unread message poll interval
- P2-1 — ISR / `unstable_cache` for anonymous discovery pages

---

*All seven performance phases implemented as of 2026-05-31.*
