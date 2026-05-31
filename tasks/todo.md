# Stripe Connect Platform — Implementation Plan

## Summary

Add Stripe Connect Express functionality so event organizers/car clubs can connect their own Stripe accounts, enable paid registrations per event, and receive payments directly via destination charges. Platform (CarShowScout) can optionally collect application fees.

---

## Implementation Steps

- [x] Step 1: Prisma schema + migration
- [x] Step 2: Stripe server utility
- [x] Step 3: Connect onboarding routes
- [x] Step 4: Organizer UI — Stripe status card
- [x] Step 5: Event payment settings
- [x] Step 6: Checkout Session creation
- [x] Step 7: Webhook handling
- [x] Step 8: Success/cancel pages
- [x] Step 9: Tests + README

---

# Registration UX Improvements — Plan

## Overview

Three changes to the event registration flow:

1. **Vehicle selection redesign** — "Add to Registration" table with category dropdown
2. **Fee summary** — Show registration fee + per-vehicle convenience fee (already implemented)
3. **Cancel registration** — Allow users to cancel from their participating events

---

## Step-by-step Plan

### Step 1: Add `eventCategoryId` to `RegistrationVehicle` schema

- Add an optional `eventCategoryId` field on `RegistrationVehicle` linking to `EventCategory`
- Run `prisma db push` to sync

### Step 2: Fetch event categories in event detail page

- Query `EventCategory` (with related `Category` name) for the event
- Pass categories as a prop to `EventRegistrationPage`

### Step 3: Update registration validation schema

- Add optional `categoryId` per vehicle in `registerForEventSchema`
  - `vehicleIds` becomes `vehicles: [{ vehicleId, categoryId? }]`
  - Or simpler: add a `vehicleCategories: Record<vehicleId, categoryId>` field

### Step 4: Redesign vehicle selection UI (event-registration-page.tsx)

- Keep existing garage vehicle toggle buttons for selection
- Replace direct selection with a two-step flow:
  1. User selects vehicles from garage (toggle buttons)
  2. Clicks "Add to Registration" button
  3. Selected vehicles move into a registration table below
- Registration table shows: Year | Make | Model | Category dropdown | Remove button
- Category dropdown populated from event's `EventCategory` list
- New vehicle rows also appear in the table with category dropdown

### Step 5: Update registration API to save category per vehicle

- Accept `vehicleCategories` map in the POST body
- When creating `RegistrationVehicle` rows, set `eventCategoryId`

### Step 6: Add cancel registration API

- New route: `DELETE /api/registrations/[id]`
- Sets `registration.status = CANCELLED`
- Only the owner can cancel their own registration
- Cannot cancel if already `CANCELLED`

### Step 7: Add cancel button to ParticipatingCard

- Add a "Cancel Registration" button to each `ParticipatingCard`
- Confirm dialog before cancelling
- Calls the cancel API, then refreshes the page
- Only shown for non-cancelled registrations

### Step 8: Fee summary (already done)

- Registration fee + per-vehicle convenience fee is already showing in both logged-in and guest forms from the previous conversation

---

## Files to modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `eventCategoryId` to `RegistrationVehicle` |
| `src/app/(public)/events/[id]/page.tsx` | Fetch and pass event categories |
| `src/lib/validation/registration.ts` | Add `vehicleCategories` to schema |
| `src/components/registration/event-registration-page.tsx` | Redesign vehicle selection with table + category |
| `src/app/api/events/[id]/register/route.ts` | Save category per vehicle |
| `src/app/api/registrations/[id]/cancel/route.ts` | New cancel registration endpoint |
| `src/components/dashboard/events/event-rows.tsx` | Add cancel button to `ParticipatingCard` |

---

## Review — Registration UX Changes

### Modified Files (6)

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added optional `eventCategoryId` FK on `RegistrationVehicle` → `EventCategory`; added reverse `registrationVehicles` relation on `EventCategory` |
| `src/app/(public)/events/[id]/page.tsx` | Fetches `EventCategory` rows for the event; serializes as `{ id, name }` array; passes `eventCategories` prop to `EventRegistrationPage` |
| `src/lib/validation/registration.ts` | Added optional `vehicleCategories: Record<vehicleId, categoryId>` field to `registerForEventSchema` |
| `src/components/registration/event-registration-page.tsx` | Two-step vehicle flow: select from garage → click "Add to Registration" → table with Year/Make/Model + category dropdown per row + remove button. Added `EventCategoryOption` type, `vehicleCategories` state, `stagedVehicles`/`registeredVehicles` state. Submit sends `vehicleCategories` map. |
| `src/app/api/events/[id]/register/route.ts` | Reads `vehicleCategories` from request body; sets `eventCategoryId` when creating each `RegistrationVehicle` |
| `src/components/dashboard/events/event-rows.tsx` | Imports and renders `CancelRegistrationButton` in `ParticipatingCard` for non-cancelled registrations |

### New Files (2)

| File | Purpose |
|------|---------|
| `src/app/api/registrations/[id]/cancel/route.ts` | POST endpoint to set registration status to `CANCELLED`. Auth-protected, owner-only. |
| `src/components/dashboard/events/cancel-registration-button.tsx` | Client component with inline confirm (Yes/No) before calling the cancel API, then refreshes page |

---

# Admin Users Management — Plan

## Todos

- [x] Schema: `UserStatus` enum + `status`, `statusReason`, `statusChangedAt` on User; `prisma db push`
- [x] Banned: middleware redirect + `/banned` page
- [x] Suspended: read-only helpers, mutation guards, dashboard/organizer banner
- [x] Admin API: GET/PATCH status on accounts; detail route; safe delete with reassignment
- [x] Admin UI: status badges, Suspend/Ban/Reactivate, View drawer, delete dialog
- [x] Hide banned user contact in organizer registrations + CSV

## Review — Admin Users Management

### Schema & access

- `UserStatus` (`ACTIVE` | `SUSPENDED` | `BANNED`) on `User` with optional `statusReason` and `statusChangedAt`
- `src/lib/user-access.ts`: `canUserWrite`, `isUserSuspended`, `isUserBanned`, `writeAccessDeniedResponse` (admins bypass suspend)
- `requireUser()` redirects banned users to `/banned`

### Auth enforcement

- **Banned**: `supabase/middleware.ts` checks `/api/auth/user-status`; non-banned routes redirect to `/banned`
- **Suspended**: mutation APIs return 403; `SuspendedAccountBanner` on dashboard and organizer layouts

### Admin

- Accounts API: status in list/detail; PATCH status with reason; DELETE replaced by reassignment flow
- `POST /api/admin/accounts/[id]/delete`: preview (GET) + transactional reassign + delete
- UI: `admin-accounts-section`, `admin-user-detail-drawer`, `admin-delete-user-dialog`

### Organizer privacy

- `mask-banned-user-contact.ts` + `registration-contact.ts`: email/phone show as "Contact hidden" for banned registrants (UI + CSV)

### Write guards (representative routes)

- Register, cancel registration, messages, vehicles CRUD, profile (`me`), events create/update, Stripe checkout (logged-in)

### Notes

- Run `npx prisma db push` after pulling schema changes (completed successfully against Supabase).
- Pre-existing `tsc` errors in stripe checkout / registration fee types are unrelated to this work.

---

# Organizer messaging — multiple recipients

## Todos

- [x] POST `/api/messages`: when `eventId` is set and `recipientUserId` is omitted, create one `Message` per distinct staff user with the event’s organizer role (same query as before, without `take: 1`); dedupe by `userId`
- [x] Return `{ messages: [...] }` with HTTP 201 when fan-out occurs; keep single `message` JSON body when a recipient is explicit or there is no organizer on the event
- [x] Compose dialog copy: clarify message goes to all organizers

## Review — Organizer messaging (multiple organizers)

### Changes

| File | Changes |
|------|---------|
| `src/app/api/messages/route.ts` | Load all `EventStaffMember` rows for the event with role slug `organizer`; `create` one message per unique `userId` in a `$transaction`; if none, preserve previous behavior (one row with `recipientUserId: null`) |
| `src/components/messages/compose-message-dialog.tsx` | Helper text updated to “all event organizers” |

### API note

- Clients that only check `res.ok` (e.g. `ComposeMessageDialog`) need no change. Fan-out responses use `{ messages: Message[] }`; other POST responses remain a single message object at the top level.

---

# Event SMS / show vehicle IDs — Plan & review

## Plan

- [x] Schema: `Event.smsVotePrefix`, `Event.nextVehicleNumber`; `RegistrationVehicle.publicVehicleId`
- [x] Allocate unique 3-char prefix on event create & clone; lazy-assign for legacy events on first vehicle sync
- [x] Stable per-event sequential IDs (001–999); sync logic preserves IDs when editing vehicles
- [x] Wire register, organizer PATCH, guest claim; backfill script for existing data
- [x] UI: show IDs on registration form, my registrations, organizer edit header

## Review

| Area | Details |
|------|---------|
| Format | `XXX-NNN` (e.g. `AXY-004`); prefix uses A–Z and 2–9 (no I, O, 0, 1) for clearer SMS entry |
| Uniqueness | Prefix unique globally; `publicVehicleId` unique globally (prefix disambiguates events) |
| Cap | 999 vehicles per event |
| Migration | `20260517120000_event_sms_vehicle_ids` — run `npx prisma migrate deploy`; optional `npx tsx scripts/backfill-sms-vehicle-ids.ts` for existing rows |

---

# Printable dash card (sample) — Plan

## Todos

- [x] Types: `DashCardModel` + nested shapes (`src/lib/dash-card-types.ts`)
- [x] Sample data object (`src/components/dash-card/sample-dash-card-data.ts`)
- [x] Reusable `DashCardPreview` + QR placeholder + print button
- [x] Preview route `/dash-card-preview`
- [x] Print CSS (landscape `@page`, color adjust, no split on `.dash-card-sheet`)
- [x] Hide site header/footer and page chrome when printing (`print:hidden`)

## Review — Printable dash card

### New / updated files

| File | Purpose |
|------|---------|
| `src/lib/dash-card-types.ts` | Prop-ready types for event, vehicle, owner, story, voting (incl. full SMS vehicle id) |
| `src/components/dash-card/sample-dash-card-data.ts` | Desert Chrome sample `SAMPLE_DASH_CARD_DATA` |
| `src/components/dash-card/dash-card-preview.tsx` | Main layout: header, large vehicle id, details, photo placeholder, story, vote/QR aside, footer |
| `src/components/dash-card/dash-card-qr-placeholder.tsx` | SVG blocks as stand-in until a real QR is generated |
| `src/components/dash-card/dash-card-print-button.tsx` | Client `window.print()`, `print:hidden` |
| `src/app/dash-card-preview/page.tsx` | Sample page wiring + short TODO for DB-backed route |
| `src/app/globals.css` | `@media print`: landscape page, margins, `print-color-adjust`, `.dash-card-sheet` break rules |
| `src/components/layout/header.tsx` | `print:hidden` on site header |
| `src/components/layout/footer.tsx` | `print:hidden` on site footer |

### Follow-ups (not done)

- Optional: scoped print layout (e.g. iframe) if global landscape `@page` conflicts with other print flows.
- `next/image` remote patterns when `logoUrl` / `vehiclePhotoUrl` / `qrImageUrl` point at arbitrary hosts.

---

# Organizer bulk dash cards

## Todos

- [x] Server loader `loadDashCardModelsForRegistrations` (per-vehicle + guest JSON vehicles)
- [x] Route `/organizer/events/[id]/dash-cards?ids=…` with auth + multi-card print page breaks
- [x] Registrations table bulk bar: secondary **Create dash cards** button
- [x] Types + preview: nullable `publicVehicleId`, SMS block only when ID assigned

## Review

| File | Change |
|------|--------|
| `src/lib/dash-cards-for-registrations.ts` | Loads event branding/venue/dates, `RegistrationVehicle` rows (class, photo, notes, `publicVehicleId`), guest `guestVehicles` when no linked rows; SMS short code from `NEXT_PUBLIC_SMS_VOTE_SHORT_CODE` or `22333` |
| `src/app/organizer/events/[id]/dash-cards/page.tsx` | Organizer-only printable batch page; wraps each `DashCardPreview` in `.dash-card-print-page` |
| `src/components/organizer/organizer-registrations-client.tsx` | **Create dash cards** (`variant="secondary"`) opens batch page with selected registration ids |
| `src/components/dash-card/dash-card-preview.tsx` | “Assigned at check-in” + SMS fallback when no public ID; vehicle title omits year `0` |
| `src/lib/dash-card-types.ts` | `publicVehicleId: string \| null`; `vehicleIdForSms` may be empty |
| `src/app/globals.css` | Print: `page-break-after` on `.dash-card-print-page` between cards |

---

# SMS Voting (Twilio-first, provider-agnostic)

## Summary

Allow attendees to vote by texting a vehicle entry code (e.g. `AXY-004`) to a shared SMS number. Start with **Twilio** webhook + signature validation; keep all voting logic in a provider-agnostic service so **Telnyx** can be added later.

## Existing project context (from inspection)

| Area | Current state |
|------|----------------|
| Vehicle entry codes | `RegistrationVehicle.publicVehicleId` (also `vehicleEntryCode` in app code); guest vehicles store `publicVehicleId` in `Registration.guestVehicles` JSON |
| Code validation | `PUBLIC_VEHICLE_ID_REGEX` in `event-sms-vehicle-id.ts`; strict `normalizeVehicleEntryCode` in `vehicle-entry-code.ts` |
| Web voting | `VehiclePublicVote` — one vote per browser fingerprint per vehicle (`voterKey` cookie hash) |
| SMS on dash cards | Hardcoded short code `22333` via `NEXT_PUBLIC_SMS_VOTE_SHORT_CODE`; vehicle ID is the only variable in the Vote panel |
| Event model | Has `smsVotePrefix` but **no** SMS voting settings, categories, or phone assignment yet |
| Registration categories | `EventCategory` = vehicle **class** at registration — **not** the same as SMS award categories |
| Tests | Vitest in `src/lib/*.test.ts` |
| Webhooks | Stripe pattern in `app/api/stripe/webhook/route.ts` (signature verify → handler) |

## Design decisions

1. **Separate SMS vote tables** — Do not reuse `VehiclePublicVote` (different duplicate rule: per phone hash per **category** per event, not per vehicle).
2. **New `VotingCategory` model** — Distinct from `EventCategory` / `EventAward`. Maps to SMS option numbers (`1`, `2`, …).
3. **`SmsNumber` platform table** — Shared inbound numbers; events link via `Event.smsNumberId`.
4. **Phone privacy** — Store only `fromPhoneHash` (HMAC-SHA256 + `SMS_PHONE_HASH_SECRET`); never raw numbers in DB or admin UI.
5. **Pending sessions** — 10-minute TTL for multi-category flows; status `pending_category | completed | expired`.
6. **Provider abstraction** — Core service accepts `InboundSmsMessage`; Twilio route parses/validates/responds with TwiML only.

## Implementation todos

### Phase 1 — Schema & migration
- [x] Add Prisma enums: `SmsProvider`, `SmsNumberStatus`, `SmsVoteSessionStatus`
- [x] Add models: `SmsNumber`, `VotingCategory`, `SmsVoteSession`, `SmsVote`
- [x] Extend `Event`: `smsVotingEnabled`, `smsVotingStartsAt`, `smsVotingEndsAt`
- [x] Create migration `20260523170000_sms_voting`

### Phase 2 — Core SMS libs (provider-agnostic)
- [x] `src/lib/sms/types.ts`
- [x] `src/lib/sms/hash-phone.ts`
- [x] `src/lib/sms/normalize-vote-code.ts`
- [x] `src/lib/sms/voting-service.ts`
- [x] `src/lib/sms/voting-window.ts`

### Phase 3 — Twilio provider
- [x] `src/lib/sms/providers/twilio.ts` (no SDK — HMAC signature + TwiML)
- [x] `src/app/api/sms/twilio/inbound/route.ts`

### Phase 4 — Admin / event settings API + UI
- [x] `GET/PATCH /api/events/[id]/sms-voting`
- [x] `EventSmsVotingSettings` on event edit page (up to 3 categories, 1 custom max)
- [x] Shared SMS number seeded from `TWILIO_PHONE_NUMBER`

### Phase 5 — Dash card integration
- [x] Dynamic SMS instruction lines on dash cards

### Phase 6 — Tests
- [x] Normalization, hash, instruction builder tests

### Phase 7 — Env & docs
- [x] `.env.example` updated

## Response messages (exact copy)

| Case | Message |
|------|---------|
| Single category vote recorded | `Thank you for voting for {vehicleEntryCode}.` |
| Multi category — pending | `Your vote has been received for {vehicleEntryCode}.\n\nReply 1 for {cat1}.\nReply 2 for {cat2}.` |
| Category reply recorded | `Thank you. Your {categoryName} vote for {vehicleEntryCode} has been recorded.` |
| Duplicate | `We already received your {categoryName} vote for this event.` |
| Invalid | `We could not understand your vote. Please text the vehicle code shown on the dash card, such as AXY-004.` |
| Expired session | Graceful re-prompt or invalid message |
| Voting closed | `SMS voting is not open for this event.` |

## Security checklist

- [ ] Twilio signature validation when auth token configured
- [ ] Server-only secrets (never `NEXT_PUBLIC_*` for Twilio or hash salt)
- [ ] Idempotency on `providerMessageId` where possible
- [ ] Validate vehicle belongs to event with SMS voting enabled and open window
- [ ] Expire pending sessions after 10 minutes

## Review (fill in after implementation)

Implemented Twilio-first SMS voting with provider abstraction. All events share one platform SMS number (`sms_numbers` seeded from `TWILIO_PHONE_NUMBER`). Event is inferred from the vehicle entry code prefix (`smsVotePrefix`). Organizers choose up to 3 voting categories (presets + optional 1 custom) on the event edit page.

| Area | Files |
|------|--------|
| Schema | `prisma/schema.prisma`, migration `20260523170000_sms_voting` |
| Core SMS | `src/lib/sms/*`, `src/lib/validation/sms-voting.ts` |
| Twilio webhook | `POST /api/sms/twilio/inbound` |
| Admin UI | `EventSmsVotingSettings` on event edit page |
| Dash cards | `dash-cards-for-registrations.ts`, `dash-card-preview.tsx` |
| Tests | `normalize-vote-code.test.ts`, `hash-phone.test.ts`, `sms-voting.test.ts` |

**Deploy steps:** `npm run db:migrate:deploy`, set `SMS_PHONE_HASH_SECRET` + Twilio env vars, point Twilio inbound webhook to `{APP_URL}/api/sms/twilio/inbound`.

**Follow-ups:** Telnyx provider stub, voting-service integration tests with DB, site-admin UI for multiple SMS numbers (not needed while all events share one number).

**Award categories (public vote):** People's Choice and Kid's Choice are locked as **Public vote** (not judge graded) in Global Settings → Award Categories. Admin UI shows a fixed badge, blocks rename/delete/toggle-off, and the API enforces the same. See `src/lib/sms/public-vote-awards.ts` and `admin-award-list.tsx`.

---

# Event Sponsor & Charitable Organization — Plan

## Summary

Expand event sponsor details and add a charitable organization section on Edit Event. Sponsor logo upload already exists (public R2 storage, shown on dash cards); this plan fills in missing contact/address fields, adds charity fields, and surfaces both on the public event page.

## Current state

| Area | Status |
|------|--------|
| Sponsor logo upload | **Done** — `EventSponsorSection` → `POST /api/events/[id]/upload` (`sponsorLogo`) → public bucket → `sponsorLogoUrl` |
| Dash card "Show sponsored by" | **Done** — renders `event.sponsorLogoUrl` |
| Sponsor text fields | **Partial** — name, phone, website only |
| Charity section | **Missing** |
| Public event page | **Missing** — sponsor/charity not shown |

## Schema changes (Prisma `Event`)

**Sponsor — add columns** (keep existing `sponsorName`, `sponsorPhone`, `sponsorWebsite`, `sponsorLogoUrl`):

- `sponsorPrimaryContact String?`
- `sponsorStreet String?`
- `sponsorCity String?`
- `sponsorState String?`
- `sponsorZip String?`
- `sponsorEmail String?`

**Charity — new columns:**

- `charityName String?`
- `charityDescription String?` (text)
- `charityWebsite String?`
- `charityEmail String?`
- `charityPhone String?`

One migration: `20260523200000_event_sponsor_charity_fields`.

## Implementation todos

### Phase 1 — Schema & validation
- [x] Add Prisma fields + migration
- [x] Extend `eventSponsorSchema` (`src/lib/validation/sponsor.ts`) with new sponsor fields + email/URL validation
- [x] Add `eventCharitySchema` (`src/lib/validation/charity.ts`)
- [x] Update `clone-event.ts` to copy all sponsor + charity fields

### Phase 2 — API
- [x] Extend `GET/PATCH /api/events/[id]/sponsor` with new sponsor fields
- [x] Add `GET/PATCH /api/events/[id]/charity` (mirror sponsor route pattern)
- [x] Confirm sponsor logo upload stays on existing public upload route (no presign change needed)

### Phase 3 — Edit Event UI
- [x] Expand `EventSponsorSection` — rename card title to **Sponsor Details**; fields: Name, Primary Contact, Address (street), City, State, Zip, Phone, Email, Website, Logo upload
- [x] Add `EventCharitySection` — Charity Name, Description (textarea), Website, Email, Phone
- [x] Wire charity card into `EventSetupListCards` (collapsible, configured indicator)

### Phase 4 — Public visibility
- [x] Pass sponsor + charity data to public event page (`events/[id]/page.tsx`)
- [x] Show sponsor logo + name/website on public sidebar or info block (staff-visible data from public URLs)
- [x] Optional: show sponsor name under logo on dash card if logo missing but name set

### Phase 5 — Tests
- [x] Validation tests for sponsor + charity schemas (email, website normalize)

## Design notes

- **Storage:** Reuse existing public upload path `events/{eventId}/sponsor-logos/` — already accessible to staff and dash cards.
- **Permissions:** Sponsor/charity PATCH routes stay organizer-only (`canManageEvent`); public page reads non-sensitive display fields only.
- **Scope:** No charity logo in v1 (not requested). No separate `Sponsor` table — flat fields on `Event` like today.

## Review (fill in after implementation)

Migration `20260523200000_event_sponsor_charity_fields` adds sponsor contact/address/email columns and charity fields on `Event`. Edit Event setup cards: **Sponsor Details** (expanded fields + public logo upload) and **Charitable Organization**. Public event sidebar shows sponsor logo/name/website and charity info. Dash cards show sponsor logo or name fallback in “Show sponsored by”.

---

# Session Idle Timeout (60 min) — Plan

## Current auth architecture (inspected)

| Layer | How it works today |
| --- | --- |
| **Identity** | Supabase Auth (`@supabase/ssr`) with HTTP-only `sb-*` cookies |
| **App user** | `getCurrentUser()` maps Supabase user → Prisma `User` row |
| **Middleware** | `src/middleware.ts` → `updateSession()` refreshes Supabase session on nearly all routes |
| **Route protection** | Unauthenticated users redirected from `/dashboard`, `/organizer`, `/admin` only |
| **Other roles** | Judges/attendees often use public routes (`/v/*`, `/events/*`, `/dashboard/*`) with page/API-level auth checks — middleware still runs but does not gate those paths |
| **Session guards** | Middleware calls `/api/auth/session-guards` for ban status + admin MFA challenge |
| **Logout** | `POST /api/auth/logout` → `supabase.auth.signOut()` + clear `sb-*` cookies |
| **MFA** | Admin TOTP enroll/challenge via `/api/me/mfa/*`, `/login/mfa`, middleware MFA redirects |
| **Idle tracking** | **None today.** `lastActivityAt` exists on `CarClub`, not on `User` |

## Design principles

1. **Server is authoritative** — middleware + API enforce expiry; client timers are UX only (warning modal).
2. **Sliding expiration** — every authenticated page navigation or API request resets the idle clock.
3. **Minimal DB load** — HttpOnly activity cookie for per-request checks; throttled `User.lastActivityAt` writes (≈ every 2 min max).
4. **Multi-tab safe** — `BroadcastChannel` + `localStorage` sync so activity in one tab protects all tabs.
5. **Do not break long workflows** — client heartbeats on typing/clicks; Stripe checkout gets a temporary idle pause.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (SessionIdleProvider)                               │
│  • Listens: click, keydown, touch, visibility, navigation   │
│  • Debounced POST /api/auth/session-activity (heartbeat)      │
│  • BroadcastChannel + localStorage sync across tabs           │
│  • Warning modal at 55 min idle (server-synced timestamp)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ heartbeat / touch
┌──────────────────────────▼──────────────────────────────────┐
│  Server                                                      │
│  • HttpOnly cookie: css_last_activity (Unix ms, sliding)     │
│  • Optional pause cookie: css_idle_paused_until (Stripe)     │
│  • Prisma User.lastActivityAt (throttled persistence)        │
│  • Middleware: if idle > 60m → sign out → /login?reason=idle │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

New file: `src/lib/session-idle-config.ts`

```ts
export const SESSION_IDLE_TIMEOUT_MINUTES = 60;
export const SESSION_WARNING_MINUTES = 55; // warn when this many minutes idle
export const SESSION_WARNING_LEAD_MINUTES =
  SESSION_IDLE_TIMEOUT_MINUTES - SESSION_WARNING_MINUTES; // 5

// Dev override (both server + client read this):
// NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES=2
```

## Implementation todos

### Phase 1 — Config & helpers
- [x] Add `session-idle-config.ts` + `session-idle.ts` (pure: `isIdleExpired`, `msUntilExpiry`, dev override)
- [x] Unit tests in `session-idle.test.ts`

### Phase 2 — Schema
- [x] Add `User.lastActivityAt DateTime?` to Prisma + migration

### Phase 3 — Server activity layer
- [x] Add `session-activity-server.ts`:
  - Read/write `css_last_activity` cookie
  - `touchSessionActivity(userId)` — update cookie + throttled DB write
  - `checkSessionIdle(request)` — returns `{ expired, lastActivityAt }`
  - Clear activity cookies on logout
- [x] `POST /api/auth/session-activity` — touch (authenticated)
- [x] `GET /api/auth/session-activity` — return `{ lastActivityAt, expiresAt, idleMs, warningAt }` for client modal
- [x] `POST /api/auth/session-activity/pause` — set `css_idle_paused_until` (Stripe checkout, max 2h)

### Phase 4 — Middleware enforcement
- [x] In `updateSession()` after `getUser()`:
  1. Skip if unauthenticated or excluded path (`/login`, `/auth/*`, `/api/auth/login`, webhook, etc.)
  2. Skip if pause cookie valid
  3. If idle expired → sign out + redirect `/login?reason=idle` (pages) or 401 JSON (API)
  4. Else → touch activity cookie (sliding) on authenticated requests (except GET session-activity status poll)
- [x] Set activity cookie on successful login

### Phase 5 — Client provider & modal
- [x] `SessionIdleProvider` mounted in root layout (only when logged in — via shell pattern like `UnreadMessagesShell`)
- [x] Event listeners + debounced heartbeat (30s debounce on input, 60s periodic while visible)
- [x] `BroadcastChannel('css-session-activity')` + `localStorage` for cross-tab sync
- [x] `SessionIdleWarningModal` at 55 min idle:
  - Message: *"Your session will expire in 5 minutes due to inactivity."*
  - **Stay Logged In** → POST touch + close modal
  - **Log Out Now** → POST logout + redirect `/login`
- [x] At 60 min (client fallback if no server round-trip): auto logout + redirect

### Phase 6 — Login UX
- [x] `/login?reason=idle` shows: *"You were signed out due to inactivity."*
- [x] Extend logout route to clear activity cookies (+ optional `?reason=idle` redirect support)

### Phase 7 — Stripe / checkout safety
- [x] Before Stripe redirect in checkout flow, call pause API so idle timer does not expire while user is on Stripe

### Phase 8 — MFA compatibility
- [x] Idle logout uses existing `signOut()` — clears AAL2; admin re-authenticates via normal login + `/login/mfa`
- [x] Exclude `/login/mfa` and `/api/auth/mfa/*`, `/api/me/mfa/*` from idle expiry (user is actively authenticating)

### Phase 9 — Testing & docs
- [x] `.env.example`: document `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES=2`
- [x] `docs/session-idle-test-checklist.md` — admin, organizer, judge, attendee, warning modal, Stay Logged In, multi-tab
- [ ] Manual verification with 2-minute dev timeout

## Paths excluded from idle enforcement

| Path | Reason |
| --- | --- |
| `/login`, `/login/mfa`, `/signup` | Auth flows |
| `/auth/*` | OAuth/email callbacks |
| `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout` | Auth endpoints |
| `/api/auth/mfa/*`, `/api/me/mfa/*` | MFA in progress |
| `/api/stripe/webhook` | No user session |
| Unauthenticated requests | No session to expire |

## Risk mitigations

| Risk | Mitigation |
| --- | --- |
| User on Stripe for 30+ min | Pause cookie set at checkout start |
| Long form typing without API calls | `keydown`/`input` events trigger debounced heartbeat |
| Autosave | Autosave `fetch` hits middleware → server touch |
| Tab open but idle in another tab | BroadcastChannel propagates activity |
| MFA mid-flow logout | MFA paths excluded from idle check |
| DB write storm | Throttle `lastActivityAt` updates to ≥2 min apart |
| Judge on `/v/*` not in protectedPaths | Middleware idle check applies to **all** authenticated requests, not just protected prefixes |

## Files (expected)

**New:** `session-idle-config.ts`, `session-idle.ts`, `session-activity-server.ts`, `session-idle.test.ts`, `session-idle-provider.tsx`, `session-idle-warning-modal.tsx`, `api/auth/session-activity/route.ts`, `api/auth/session-activity/pause/route.ts`, `docs/session-idle-test-checklist.md`

**Modified:** `prisma/schema.prisma`, `middleware.ts`, `login/route.ts`, `logout/route.ts`, `login/page.tsx`, `login-form.tsx`, `layout.tsx` or `unread-messages-shell.tsx`, Stripe checkout caller, `.env.example`

## Review (fill in after implementation)

Implemented 60-minute sliding idle logout for all authenticated users. Server enforcement via HttpOnly `css_last_activity` cookie in middleware; `User.lastActivityAt` persisted with 2-minute throttle. Client `SessionIdleProvider` shows warning at 55 minutes (UX only); multi-tab sync via BroadcastChannel + localStorage. Stripe checkout sets 2-hour pause cookie before redirect. Login page shows idle message at `/login?reason=idle`. Dev testing: `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES=2`. Run migration `20260530200000_user_last_activity_at`. See `docs/session-idle-test-checklist.md`.

