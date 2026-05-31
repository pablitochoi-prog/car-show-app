# CarShowScout Performance & Scalability Audit

**Date:** 2026-05-31  
**Scope:** `/car-show-app` — full-stack review before public launch  
**Method:** Static code review of Prisma schema, API routes, server/client pages, asset pipeline, and third-party integrations. No code changes in this pass.

---

## Executive Summary

CarShowScout has solid foundations in some areas (Prisma connection pooling for Supabase pgbouncer in `src/lib/db.ts`, transactional registration writes, sale-inquiry rate limits, SMS vote deduplication via unique constraints). However, **there is no application-level caching layer** (`unstable_cache`, `revalidate`, or cache tags are absent from `src/`), and several **hot paths load unbounded datasets** or perform **O(n) work per request** (guest vehicle lookup, organizer registration lists, dash-card print).

The **top launch risks** for hundreds of concurrent users:

1. **Guest vehicle entry lookup** scans all guest registrations for an SMS prefix (`findVehicleEntryByCode` in `src/lib/vehicle-entry-lookup.ts`) — affects every QR vote, sale page, photo, and SMS vote.
2. **Unprotected public write endpoints** — guest registration, member registration, web voting, and Twilio inbound have **no HTTP rate limiting** (only business-rule dedup).
3. **Registration POST blocks on email + R2 staff-photo sync** before returning (`register/route.ts`, `register-guest/route.ts`).
4. **Organizer event-day paths** load entire registration sets and run parallel R2/DB work for dash cards (`registrations/page.tsx`, `dash-cards-for-registrations.ts`).
5. **Public `/events` search** returns all matching events with no pagination and uses `contains` ILIKE on name/venue/description (`events-queries.ts`, `events/page.tsx`).
6. **No observability** — no Sentry, structured logging, or route timing in the codebase.

Supabase pooler is configured with **`connection_limit=1` per serverless instance** (`src/lib/db.ts` L48–54). Under Vercel Fluid/serverless concurrency, this prevents connection storms but can **queue DB access** unless queries are fast and request duration is bounded.

---

## Priority 0: Launch Blockers

### P0-1 — Guest vehicle lookup scans all guest registrations per prefix

| | |
|---|---|
| **Risk** | Every QR lookup for guest vehicles loads **all guest registrations** for events sharing an SMS prefix, then scans JSON arrays in memory. Cost grows with guest count × prefix collisions. |
| **Evidence** | `findVehicleEntryByCode()` L154–217 in `src/lib/vehicle-entry-lookup.ts`: indexed `registrationVehicle.findUnique` fast-path, then `event.findMany({ smsVotePrefix })` + `registration.findMany({ eventId in ..., userId: null })` + nested loop over `guestVehicles` JSON. Same pattern in `findVehicleEntryPhotoObjectKey` (`src/lib/vehicle-entry-photo.ts`). |
| **File(s)** | `src/lib/vehicle-entry-lookup.ts`, `src/lib/vehicle-entry-photo.ts`; callers: `src/app/api/v/[vehicleEntryCode]/vote/route.ts`, `src/app/api/v/[vehicleEntryCode]/photo/route.ts`, `src/app/v/[vehicleEntryCode]/sale/page.tsx`, `src/lib/sms/voting-service.ts`, `src/lib/public-vehicle-sale-listing.ts` |
| **Why it matters** | On event day, hundreds of users scan QR codes for voting, sale inquiries, and photos simultaneously. Guest entries bypass the indexed `publicVehicleId` unique on `RegistrationVehicle`. |
| **Recommended fix** | Materialize guest `publicVehicleId` into a queryable table or indexed column (e.g. extend `RegistrationVehicle`-like guest row table, or `GuestVehicleEntry` with `@@index([publicVehicleId])`). Short-term: cache lookup results in Redis/Vercel Runtime Cache keyed by code (TTL 60s). |
| **Effort** | Large |
| **Cursor follow-up** | *"Add indexed guest vehicle entry lookup: stop scanning guestVehicles JSON in findVehicleEntryByCode. Propose minimal schema migration and update vote/photo/sale routes."* |

---

### P0-2 — Public registration endpoints lack rate limiting

| | |
|---|---|
| **Risk** | Unauthenticated or low-friction POST endpoints can be spammed, exhausting DB connections, SendGrid quota, and R2 copy bandwidth. |
| **Evidence** | `src/app/api/events/[id]/register-guest/route.ts` — no auth, no rate limit. `src/app/api/events/[id]/register/route.ts` — auth required but no rate limit. Only rate-limited public write found: `checkVehicleSaleInquiryRateLimit` in `src/lib/vehicle-sale-inquiry-rate-limit.ts` (5/listing/hr, 5/email/hr, 10/ipHash/hr). Organizer OTP has rate limit in `src/lib/step-up-otp.ts` / `src/app/api/organizer/otp/send/route.ts`. |
| **File(s)** | `src/app/api/events/[id]/register/route.ts`, `src/app/api/events/[id]/register-guest/route.ts`, `src/app/api/v/[vehicleEntryCode]/vote/route.ts`, `src/app/api/sms/twilio/inbound/route.ts` |
| **Why it matters** | A botnet submitting guest registrations or votes during a popular show can degrade experience for real exhibitors and organizers. |
| **Recommended fix** | Add IP + fingerprint rate limits (Vercel Firewall WAF rules or Upstash Redis sliding window) on register-guest, vote, and sale inquiry. Keep honeypot on inquiry; add CAPTCHA on guest register if abuse appears. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Add Redis/Upstash rate limiting middleware for POST /api/events/[id]/register-guest and POST /api/v/[code]/vote with sensible limits per IP."* |

---

### P0-3 — Registration response blocked on SendGrid + R2 staff-photo sync

| | |
|---|---|
| **Risk** | User waits for email delivery and per-vehicle R2 copy before receiving JSON response; under load, request duration spikes and ties up serverless concurrency. |
| **Evidence** | `src/app/api/events/[id]/register/route.ts` L376–382: `await syncAllRegistrationStaffPhotos(registration.id)` then `await notifyRegistrationConfirmationEmail(registration.id)` before `NextResponse.json`. Same in `register-guest/route.ts` L171–176. `syncAllRegistrationStaffPhotos` loops vehicles with R2 Get/Put per vehicle (`src/lib/event-registration-staff-photos.ts` L198–219). |
| **File(s)** | `src/app/api/events/[id]/register/route.ts`, `src/app/api/events/[id]/register-guest/route.ts`, `src/lib/event-registration-staff-photos.ts`, `src/lib/email/notify-registration-confirmation-email.ts` |
| **Why it matters** | Registration spikes (opening day, deadline) coincide with highest concurrent load. Slow responses feel like the app is broken; serverless instances stay busy. |
| **Recommended fix** | Return 201 immediately after transaction commit; enqueue email and staff-photo sync via background job (Vercel Workflow, Inngest, or at minimum `waitUntil()` for non-blocking side effects). Defer staff photos to first dash-card print or lazy on first staff-photo view. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Make registration POST return immediately after DB transaction; move notifyRegistrationConfirmationEmail and syncAllRegistrationStaffPhotos to waitUntil/background job."* |

---

### P0-4 — Organizer registrations page loads entire event without pagination

| | |
|---|---|
| **Risk** | Large events (500+ registrants) load all rows server-side, serialize to client, then filter/sort in browser — slow TTFB, large HTML/JSON payload, memory pressure. |
| **Evidence** | `src/app/organizer/events/[id]/registrations/page.tsx` L59–93: `prisma.registration.findMany({ where: { eventId } })` with no `take`. Client `src/components/organizer/organizer-registrations-client.tsx` L106–144: `sortRows()` + `applyColumnFilters()` in memory. Export route also unbounded: `src/app/api/events/[id]/registrations/export/route.ts` L44–79. |
| **File(s)** | `src/app/organizer/events/[id]/registrations/page.tsx`, `src/components/organizer/organizer-registrations-client.tsx`, `src/app/api/events/[id]/registrations/export/route.ts` |
| **Why it matters** | Organizers are critical users on event day. A frozen registration table during check-in is a launch failure. |
| **Recommended fix** | Server-side pagination (cursor or offset) with URL params; move column filters to Prisma `where`. Stream CSV export or async job + download link. |
| **Effort** | Large |
| **Cursor follow-up** | *"Paginate organizer registrations server-side: API + page with 50 rows, preserve column filters as query params."* |

---

### P0-5 — Dash-card bulk print triggers N× staff-photo sync + N× QR R2 uploads

| | |
|---|---|
| **Risk** | Printing dash cards for 100 registrations triggers 100× `syncAllRegistrationStaffPhotos`, deep registration queries, and parallel QR generation/R2 uploads before page render. |
| **Evidence** | `src/lib/dash-cards-for-registrations.ts` L229–237: `Promise.all(uniqueRegIds.map(syncAllRegistrationStaffPhotos))`. L283–328: deep `registration.findMany` with vehicle includes. L560 area: `ensureVehicleQrsForEntryCodes`. `src/lib/ensure-dash-card-vehicle-qrs.ts`: per-code DB + R2. Page: `src/app/organizer/events/[id]/dash-cards/page.tsx`. |
| **File(s)** | `src/lib/dash-cards-for-registrations.ts`, `src/lib/event-registration-staff-photos.ts`, `src/lib/ensure-dash-card-vehicle-qrs.ts`, `src/app/organizer/events/[id]/dash-cards/page.tsx` |
| **Why it matters** | Organizers print all cards morning-of-show; this is a predictable traffic spike combining DB, R2, and CPU (QR SVG generation). |
| **Recommended fix** | Pre-generate QRs and staff-photo snapshots at registration time (async). Dash-card page reads precomputed models only. Batch print via job + PDF download instead of synchronous SSR for 200+ cards. |
| **Effort** | Large |
| **Cursor follow-up** | *"Refactor dash-card load path: remove syncAllRegistrationStaffPhotos from loadDashCardModelsForRegistrations; rely on snapshots created at registration or background job."* |

---

### P0-6 — No observability for production incidents

| | |
|---|---|
| **Risk** | Cannot detect slow queries, error spikes, or third-party failures during launch traffic. |
| **Evidence** | Grep for Sentry, Datadog, OpenTelemetry, pino — **no matches** in `src/`. Errors logged via `console.error` only (e.g. register route L379). |
| **File(s)** | Codebase-wide |
| **Why it matters** | Without metrics, you won't know if p95 registration latency is 2s or 30s until users complain. |
| **Recommended fix** | Add Sentry (errors + performance) or Vercel Observability; enable Prisma query logging in staging; add structured route timing wrapper for hot API paths. |
| **Effort** | Small–Medium |
| **Cursor follow-up** | *"Add Sentry Next.js integration with transaction tracing on /api/events/[id]/register and findVehicleEntryByCode."* |

---

## Priority 1: High-Impact Refactors

### P1-1 — Public event search unbounded + ILIKE without pagination

| | |
|---|---|
| **Risk** | `/events` returns all published matches; text search uses case-insensitive `contains` on name, venue, description — sequential scans as catalog grows. |
| **Evidence** | `src/app/(public)/events/page.tsx` L92–110: `findMany` no `take`. `src/lib/events-queries.ts` L20–25: OR on three text fields with `mode: "insensitive"`. Logged-in users also call `getRegisteredEventStatusMapForUser` (all lifetime registrations) L88–90. |
| **File(s)** | `src/app/(public)/events/page.tsx`, `src/lib/events-queries.ts`, `src/lib/user-registered-events.ts` |
| **Why it matters** | Primary discovery page for public visitors; degrades as national catalog grows. |
| **Recommended fix** | Paginate (24–48 per page); default `to` date filter in query (form shows default but query only applies when `to` in URL — L80–83 vs L92). Add trigram/GiST index on `Event.name`, `Event.city` for Postgres. Cache anonymous event list with `revalidate: 300`. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Add pagination and default date upper bound to public events page; apply buildPublishedWhere with default to date."* |

---

### P1-2 — `getRegisteredEventStatusMapForUser` loads all user registrations on every browse

| | |
|---|---|
| **Risk** | Logged-in user viewing `/events` triggers full registration history + all tiers for touched events + platform fee lookup. |
| **Evidence** | `src/lib/user-registered-events.ts` L31–128: unbounded `registration.findMany` + `registrationTier.findMany` for all event IDs. Called from `events/page.tsx` L88–90 and event detail `page.tsx`. |
| **File(s)** | `src/lib/user-registered-events.ts`, `src/app/(public)/events/page.tsx` |
| **Recommended fix** | Limit to events in current search result set (`eventId in [...]`). Cache per-user status map with short TTL. Or compute status only for visible page of events. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Optimize getRegisteredEventStatusMapForUser to accept optional eventIds filter; use on events page for current result set only."* |

---

### P1-3 — Sale inquiry POST blocks on SendGrid (and future SMS)

| | |
|---|---|
| **Risk** | Buyer inquiry waits for email send before response; duplicate listing fetch. |
| **Evidence** | `src/app/api/v/[vehicleEntryCode]/sale/inquiry/route.ts`: rate limit L128–134; then create + email + SMS stub + multiple updates L147–235. `loadActiveVehicleSaleListingForInquiry` in `src/lib/public-vehicle-sale-listing.ts` re-queries listing after page loader. |
| **File(s)** | `src/app/api/v/[vehicleEntryCode]/sale/inquiry/route.ts`, `src/lib/public-vehicle-sale-listing.ts` |
| **Recommended fix** | Return 201 after DB create; queue email/SMS. Wrap inquiry create + status updates in `$transaction`. Collapse duplicate listing queries. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Make sale inquiry email async; wrap inquiry create/status in prisma.$transaction."* |

---

### P1-4 — Web voting endpoint has no HTTP rate limit

| | |
|---|---|
| **Risk** | `recordPublicVote` dedupes by cookie fingerprint + DB unique constraints (`src/lib/vehicle-voting.ts` L212–239) but attacker can rotate fingerprints/IP. |
| **Evidence** | `src/app/api/v/[vehicleEntryCode]/vote/route.ts` L11 `force-dynamic`; no rate limit wrapper. Each vote calls `findVehicleEntryByCode` + category load + vote queries. |
| **File(s)** | `src/app/api/v/[vehicleEntryCode]/vote/route.ts`, `src/lib/vehicle-voting.ts` |
| **Recommended fix** | Rate limit by IP + eventId (e.g. 30 votes/hr/IP). Consider edge caching of open categories per event (short TTL). |
| **Effort** | Small–Medium |
| **Cursor follow-up** | *"Add rate limiting to POST /api/v/[vehicleEntryCode]/vote."* |

---

### P1-5 — Twilio inbound SMS has no rate limiting; `ensureSharedSmsNumber()` every request

| | |
|---|---|
| **Risk** | SMS voting spike hits DB on every inbound message; shared number bootstrap on each POST. |
| **Evidence** | `src/app/api/sms/twilio/inbound/route.ts` L14 `force-dynamic`, L27 `ensureSharedSmsNumber()`, L60 `processInboundSmsVote`. `src/lib/sms/voting-service.ts`: multiple DB round-trips per SMS. |
| **File(s)** | `src/app/api/sms/twilio/inbound/route.ts`, `src/lib/sms/voting-service.ts` |
| **Recommended fix** | Cache shared SMS number in memory/module scope. Ensure Twilio signature validation stays first. Monitor Twilio webhook latency; consider idempotency on `providerMessageId` (index exists on `SmsVote`). |
| **Effort** | Small |
| **Cursor follow-up** | *"Cache ensureSharedSmsNumber result; add idempotent handling for duplicate Twilio message SIDs."* |

---

### P1-6 — Missing DB indexes on high-traffic FK lookups

| | |
|---|---|
| **Risk** | Registration vehicle joins and message inbox sort degrade at scale. |
| **Evidence** | `RegistrationVehicle` in `prisma/schema.prisma` L542–574: `@@unique([registrationId, vehicleId])` but **no `@@index([registrationId])`**. `Registration` has `[eventId]` but not `[eventId, status]`. `Message` has `[recipientUserId]` but not `[recipientUserId, createdAt]`. |
| **File(s)** | `prisma/schema.prisma` |
| **Recommended fix** | See **Database Index Recommendations** below. |
| **Effort** | Small |
| **Cursor follow-up** | *"Add Prisma migration for RegistrationVehicle(registrationId), Registration(eventId, status), Message(recipientUserId, createdAt)."* |

---

### P1-7 — Global config fetched from DB on many requests (`getPlatformFee`)

| | |
|---|---|
| **Risk** | `getPlatformFee()` hits `globalSetting.findUnique` on every call — used in events browse, registration pages, dashboards, checkout. |
| **Evidence** | `src/lib/platform-fee.ts` L29–32. Called from 14+ files including `user-registered-events.ts`, `events/[id]/page.tsx`, `organizer/.../registrations/page.tsx`, `stripe/checkout/route.ts`. |
| **File(s)** | `src/lib/platform-fee.ts` + callers |
| **Recommended fix** | Module-level cache with 60s TTL or `unstable_cache` with tag invalidation on admin convenience-fee update. |
| **Effort** | Small |
| **Cursor follow-up** | *"Cache getPlatformFee and getEventSetupFee with unstable_cache and revalidate on admin update."* |

---

### P1-8 — Unread messages polling every 30s per active session

| | |
|---|---|
| **Risk** | 200 logged-in users → ~400 requests/min to `/api/messages/unread-count` regardless of activity. |
| **Evidence** | `src/components/messages/unread-messages-provider.tsx` L13–14 `POLL_INTERVAL_MS = 30_000`; L62–64 fetch with `cache: "no-store"`. |
| **File(s)** | `src/components/messages/unread-messages-provider.tsx`, `src/app/api/messages/unread-count/route.ts` |
| **Recommended fix** | Increase interval to 60–120s; poll only when tab visible (partially implemented via visibility); use SSE or push later. |
| **Effort** | Small |
| **Cursor follow-up** | *"Reduce unread message poll frequency and skip polling when document.hidden."* |

---

### P1-9 — Large client bundles on critical paths

| | |
|---|---|
| **Risk** | Slow TTI on registration and public sale inquiry on mobile networks. |
| **Evidence** | `src/components/registration/event-registration-page.tsx` (1938 lines, `"use client"`). `src/components/forms/event-form.tsx` (2202 lines). TipTap in `src/components/admin/rich-text-editor.tsx` used by `src/components/sale/public-vehicle-sale-inquiry-form.tsx` and `vehicle-sale-listing-fields.tsx`. Unused deps: `@stripe/stripe-js`, `qrcode.react` (in `package.json`, not imported in `src/`). |
| **File(s)** | See above |
| **Recommended fix** | Dynamic `import()` for RichTextEditor, vehicle sale dialog, image lightbox. Split event-registration-page into smaller lazy sections. Remove dead deps. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Dynamic import RichTextEditor on public-vehicle-sale-inquiry-form; analyze bundle with @next/bundle-analyzer."* |

---

### P1-10 — Stripe checkout over-fetches event tiers

| | |
|---|---|
| **Risk** | Every checkout session loads registration with nested event including **all** `registrationTiers`. |
| **Evidence** | `src/app/api/stripe/checkout/route.ts` L45–73: deep include with `event.registrationTiers`. |
| **File(s)** | `src/app/api/stripe/checkout/route.ts` |
| **Recommended fix** | `select` only the registration's `tierId` tier + payment fields needed for session creation. |
| **Effort** | Small |
| **Cursor follow-up** | *"Narrow Prisma select in stripe checkout route to required fields only."* |

---

### P1-11 — Bulk registration cancel/refund sequential Stripe calls

| | |
|---|---|
| **Risk** | Organizer bulk action loops IDs with `stripe.refunds.create` per registration — long request, partial failure. |
| **Evidence** | `src/app/api/events/[id]/registrations/bulk/route.ts` L126–245: sequential loop. |
| **File(s)** | `src/app/api/events/[id]/registrations/bulk/route.ts` |
| **Recommended fix** | Background job with progress UI; idempotent refund per registration; return 202 Accepted. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Move bulk registration refunds to async job with status polling."* |

---

### P1-12 — Admin sale inquiries load 500 rows with deep includes

| | |
|---|---|
| **Risk** | Admin inquiry list fetches up to 500 inquiries with listing → vehicle → registration graph. |
| **Evidence** | `src/lib/vehicle-sale-inquiries-for-seller.ts` L43–58 `inquiryInclude`, L127–134 `take: 500`. Seller dashboard `take: 200`. |
| **File(s)** | `src/lib/vehicle-sale-inquiries-for-seller.ts`, `src/app/admin/sale-inquiries/page.tsx` |
| **Recommended fix** | Paginate admin list; flatten select to fields needed for table; detail page loads graph. |
| **Effort** | Medium |
| **Cursor follow-up** | *"Paginate loadSaleInquiriesForAdmin; use shallow select for list view."* |

---

## Priority 2: Nice-to-Have Optimizations

### P2-1 — Zero caching/revalidation strategy

| | |
|---|---|
| **Risk** | Every page request hits DB; no ISR for public marketing/discovery content. |
| **Evidence** | Grep: no `unstable_cache`, `revalidatePath`, `revalidateTag` in `src/`. 64/118 API routes set `force-dynamic`; no page-level `revalidate`. |
| **Recommended fix** | `revalidate: 300` on `/events` for anonymous users; cache tags on event detail public fields; `force-static` for `/terms`, `/privacy` if not already static. |
| **Effort** | Medium |

---

### P2-2 — Most user-uploaded photos use raw `<img>` not `next/image`

| | |
|---|---|
| **Risk** | No automatic resizing/WebP; large R2 URLs loaded at full resolution in lists and lightbox. |
| **Evidence** | `next/image` in 7 files; raw `<img>` in 18+ component files including `vehicle-photo-display.tsx`, `public-vehicle-sale-photos.tsx`, `event-registration-page.tsx`. `next.config.ts` L7–19: remote patterns for Supabase + `photos.carshowscout.com` only. |
| **Recommended fix** | Use `next/image` with `sizes` for listing thumbnails; generate thumbnail keys on upload (prefix `-thumb.webp`). |
| **Effort** | Medium |

---

### P2-3 — Event flyer PDF in search/browse cards

| | |
|---|---|
| **Risk** | Flyers can be PDF (`src/app/api/events/[id]/upload/route.ts` accepts pdf); if shown in cards via `ThumbnailWithEye`, large downloads hurt mobile browse. |
| **Recommended fix** | Serve PDF icon placeholder in list views; lazy-load flyer only on event detail. |
| **Effort** | Small |

---

### P2-4 — Google Places called synchronously on event create/edit

| | |
|---|---|
| **Risk** | `src/app/api/maps/resolve-location/route.ts` and event create POST geocoding block organizer save. |
| **Evidence** | `src/lib/resolve-event-location.ts`: Places Text Search + Details + Geocode fallback. `src/app/api/events/route.ts` L155–160. |
| **Recommended fix** | Debounce client-side; cache placeId → lat/lng; optional async geocode after save. |
| **Effort** | Small |

---

### P2-5 — Voting tabulation report loads all vehicles in memory

| | |
|---|---|
| **Risk** | `src/lib/event-reports/voting-tabulation.ts`: all RV rows + guest regs for event, then in-memory sort. |
| **Recommended fix** | SQL aggregation for counts; paginate report sections. |
| **Effort** | Medium |

---

### P2-6 — Client-side admin search refetches 100 rows on every search submit

| | |
|---|---|
| **Risk** | `src/components/admin/admin-search-table.tsx` L48–50: mount fetch + manual search; no debounce. |
| **Recommended fix** | Debounce 300ms; cursor pagination. |
| **Effort** | Small |

---

### P2-7 — Middleware runs Supabase session refresh on nearly all routes

| | |
|---|---|
| **Risk** | `src/middleware.ts` matcher excludes static assets but runs on all pages/API (except listed extensions) — adds latency to public anonymous pages. |
| **Recommended fix** | Narrow matcher to authenticated route prefixes where possible; measure impact first. |
| **Effort** | Medium (risky — test auth thoroughly) |

---

## Database Index Recommendations

| Model | Field(s) | Reason | Suggested Prisma change |
|-------|----------|--------|-------------------------|
| `RegistrationVehicle` | `registrationId` | Every registration detail/load joins RV by registration FK | `@@index([registrationId])` |
| `Registration` | `eventId`, `status` | Organizer lists filter by event + status | `@@index([eventId, status])` |
| `Registration` | `status` | Cross-event admin reports (optional) | `@@index([status])` |
| `Message` | `recipientUserId`, `createdAt` | Inbox sorted by date | `@@index([recipientUserId, createdAt(sort: Desc)])` |
| `EventStaffMember` | `userId` | Dashboard “managing events” (`dashboard-managing-events.ts` uses raw SQL workaround) | `@@index([userId])` |
| `OrganizationMember` | `orgId` | Club member lists | `@@index([orgId])` |
| `VehicleSaleInquiry` | `eventId`, `status` | `loadEventSaleInquiryStats` counts by event + status | `@@index([eventId, status])` |
| `VehicleJudgeScore` | `eventId`, `judgeUserId` | Judge dashboard lookups | `@@index([eventId, judgeUserId])` |
| `Event` | `name` (trigram) | ILIKE search on name — **requires raw SQL migration** | `CREATE INDEX ... USING gin (name gin_trgm_ops)` |
| `Event` | `startDate` | Already composite `[status, startDate]` — verify query plans use it for date-range browse | Monitor; may add `[startDate]` if filtering without status |

**Existing indexes (good):** `Event @@index([status, startDate])`, `[city, state]`, `[orgId]`; `RegistrationVehicle.publicVehicleId @unique`; `VehiclePublicVote` / `SmsVote` entry-code indexes; `VehicleSaleListing @@index([eventId, enabled])`.

---

## Caching / Rendering Recommendations

| Route / Page | Current behavior | Recommended behavior | Invalidation |
|--------------|------------------|----------------------|--------------|
| `/events` | SSR dynamic; unbounded `findMany` | ISR `revalidate: 300` for anonymous; paginate; separate logged-in badge fetch | `revalidateTag('events')` on event publish/update |
| `/events/[id]` (public view) | SSR; multiple parallel DB calls | Cache static event metadata (name, venue, dates, logo) with short TTL | Tag per `eventId` on edit |
| `/terms`, `/privacy` | SSR | Static generation if content is stable | On admin legal policy update |
| `getPlatformFee()` | DB every call | `unstable_cache` 60s | Tag `platform-fee` on admin update |
| `findVehicleEntryByCode()` | DB every QR scan | Runtime Cache / Redis 60–300s keyed by code | Invalidate on registration vehicle ID assignment |
| `/v/[code]/sale` | Full SSR + 3+ queries | Cache public listing payload when no PII | On listing update |
| Organizer registrations | Full SSR all rows | Client pagination API; no full SSR | N/A |
| Dash cards | Sync heavy work on page load | Precomputed assets; async PDF job | On registration photo/vehicle update |

**Note:** No `unstable_cache` or `revalidateTag` exists today — any caching is net-new infrastructure.

---

## API Route Risk Table

| Endpoint | Risk | Severity | Mitigation |
|----------|------|----------|------------|
| `POST /api/events/[id]/register-guest` | No auth/rate limit; email+R2 before response | **Critical** | Rate limit; async side effects |
| `POST /api/events/[id]/register` | No rate limit; sync email+R2 | **High** | Rate limit; async side effects |
| `GET /api/v/[code]/vote` / POST vote | No HTTP rate limit; entry lookup cost | **High** | Rate limit; cache entry lookup |
| `POST /api/sms/twilio/inbound` | Webhook flood; multi-query per SMS | **High** | Twilio sig verify (exists); idempotency; monitor |
| `POST /api/v/[code]/sale/inquiry` | Sync email; rate limit exists | **Medium** | Async email; transaction wrap |
| `GET /api/events/[id]/registrations/export` | Unbounded CSV | **High** | Stream/async export |
| `POST /api/events/[id]/registrations/bulk` | Sequential Stripe refunds | **High** | Background job |
| `GET /api/messages/unread-count` | Polled every 30s/user | **Medium** | Longer interval; visibility gate |
| `POST /api/maps/resolve-location` | Google API cost/latency | **Low** | Auth'd; debounce client |
| `POST /api/stripe/webhook` | Must stay sync for Stripe | **Low** | Idempotent fulfillment (verify existing) |
| `GET /api/admin/categories` | Unbounded findMany | **Medium** | Paginate or cache (small table OK short-term) |
| `GET /api/admin/awards` | Unbounded + `ensureLockedPublicVoteAwards()` each GET | **Medium** | Cache; run ensure on write only |
| `POST /api/uploads/presign` | Large upload abuse | **Medium** | Rate limit; size caps (verify presign limits) |
| `POST /api/events/[id]/register-guest/upload` | File upload spam | **Medium** | Rate limit per IP/event |
| `GET /api/v/[code]/photo` | R2 egress on scan spike | **Medium** | CDN cache headers on public photos |

---

## Load Testing Plan

Use **k6** (recommended) or **Artillery** against staging with production-like Supabase pooler and R2. Record p50/p95/p99 and error rate.

### Scenario A — Public event search (anonymous)

- **Flow:** `GET /events`, `GET /events?state=CA&city=Los+Angeles`, `GET /events?q=corvette`
- **Targets:**

| Concurrent users | Duration | Pass criteria |
|------------------|----------|---------------|
| 50 | 5 min | p95 < 800ms, 0% 5xx |
| 100 | 5 min | p95 < 1.2s, 0% 5xx |
| 250 | 5 min | p95 < 2s, < 0.1% 5xx |
| 500 | 5 min | p95 < 3s, < 0.5% 5xx; identify breaking point |

### Scenario B — Event detail + registration page (mixed auth)

- **Flow:** `GET /events/{id}`, `GET /events/{id}/register` (cookie jar for subset)
- **Targets:** Same tiers; p95 register page < 2s at 100 users

### Scenario C — Registration submission spike

- **Flow:** `POST /api/events/{id}/register-guest` with valid payload (unique emails)
- **Targets:**

| Concurrent users | Pass criteria |
|------------------|---------------|
| 50 | p95 < 5s, no DB connection errors |
| 100 | p95 < 8s; watch Supabase pooler queue |
| 250 | Document failure mode; expect degradation without async email |

### Scenario D — Organizer dashboard (authenticated)

- **Flow:** Login → `GET /organizer/events/{id}/registrations` → `GET /organizer/events/{id}/dash-cards?ids=...`
- **Targets:** 20 concurrent organizers; registrations p95 < 3s at 500 rows (seed data)

### Scenario E — Vehicle sale inquiry

- **Flow:** `GET /v/{code}/sale` → `POST /api/v/{code}/sale/inquiry`
- **Targets:** 50 concurrent; verify 429 after rate limit; p95 POST < 2s

### Scenario F — QR / voting / photo lookup

- **Flow:** `GET /api/v/{code}/vote` (GET metadata), `POST` vote, `GET /api/v/{code}/photo`, `GET /v/{code}/sale`
- **Targets:** 100 concurrent mixed codes; p95 lookup < 500ms at 100 users (guest codes will fail until P0-1 fixed)

### k6 skeleton

```javascript
// scripts/load/public-events.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1200'] },
};
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/events`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Performance budgets (recommended)

| Metric | Budget |
|--------|--------|
| Public `/events` TTFB (p95) | < 800ms |
| Event detail TTFB (p95) | < 1s |
| Registration POST response (p95) | < 2s (after async refactor) |
| QR lookup API (p95) | < 300ms |
| JS bundle (registration page) | < 350KB gzip (after splits) |
| LCP event detail mobile | < 2.5s |
| DB queries per registration POST | < 15 (after optimizations) |

---

## Quick Wins

1. **Add indexes** — `RegistrationVehicle(registrationId)`, `Registration(eventId, status)`, `Message(recipientUserId, createdAt)` — low risk migration.
2. **Cache `getPlatformFee` / `getEventSetupFee`** — 60s in-memory or `unstable_cache`.
3. **Rate-limit guest registration and vote endpoints** — Vercel Firewall or Upstash.
4. **Increase unread poll interval** to 60–120s (`unread-messages-provider.tsx`).
5. **Narrow Stripe checkout Prisma select** — remove full tier list include.
6. **Default `/events` query `to` date** — apply `buildPublishedWhere` default upper bound (form already shows it in `events/page.tsx` L82–83 but query at L92 omits default).
7. **Remove unused deps** — `@stripe/stripe-js`, `qrcode.react` from `package.json`.
8. **Dynamic import TipTap** on public sale inquiry form only.
9. **Cache `ensureSharedSmsNumber()`** in module scope for Twilio webhook.
10. **Add Sentry** — errors + performance on register, vote, sale inquiry routes.

---

## Do Not Change Yet

| Change | Why wait |
|--------|----------|
| Remove Supabase middleware from public routes | Risk breaking session refresh / auth on hybrid pages |
| Switch guest JSON vehicles to full normalized schema without migration plan | Data migration complexity; needs backfill script |
| Replace ILIKE with Elasticsearch/OpenSearch | Operational overhead; trigram indexes may suffice for launch |
| Make dash-card print fully async/PDF-only | UX change for organizers; needs product sign-off |
| Reduce Prisma `connection_limit=1` on pooler | Can cause EMAXCONN on Supabase; tune only with load test data |
| Move Stripe webhook handling off synchronous path | Stripe requires quick 200; fulfillment can be async but idempotency must be proven first |
| Aggressive ISR on personalized pages | Logged-in registration status badges need per-user data — split anonymous shell from personalized fragments |

---

## Observability & Testing Recommendations

| Area | Recommendation |
|------|----------------|
| Prisma | Enable `log: ['query']` in staging; log queries > 200ms with route name |
| API routes | Wrapper `{ route, durationMs, status }` structured log on register, vote, inquiry, twilio inbound |
| Errors | Sentry with release = git SHA; source maps on Vercel |
| Vercel | Enable Web Analytics + Speed Insights on production |
| DB | Supabase dashboard: connection count, slow queries, index usage after migration |
| Alerts | 5xx rate > 1% for 5 min; p95 register > 5s; Supabase connections > 80% |

---

## Appendix: Key file reference map

| Domain | Primary files |
|--------|---------------|
| DB client / pool | `src/lib/db.ts` |
| Schema | `prisma/schema.prisma` |
| Event search | `src/lib/events-queries.ts`, `src/app/(public)/events/page.tsx` |
| Vehicle QR lookup | `src/lib/vehicle-entry-lookup.ts` |
| Registration API | `src/app/api/events/[id]/register/route.ts`, `register-guest/route.ts` |
| Dash cards | `src/lib/dash-cards-for-registrations.ts`, `src/lib/event-registration-staff-photos.ts` |
| Voting | `src/lib/vehicle-voting.ts`, `src/lib/sms/voting-service.ts` |
| Sale inquiries | `src/lib/vehicle-sale-inquiry-rate-limit.ts`, `src/app/api/v/.../sale/inquiry/route.ts` |
| Images / R2 | `src/lib/r2.ts`, `src/lib/upload-destinations.ts`, `next.config.ts` |
| Caching | **None implemented** |

---

*End of audit. No application code was modified in this pass.*
