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

---

# Organizer Email OTP Step-Up — Plan

## Architecture inspection summary

### How organizers are represented

| Layer | Model |
| --- | --- |
| **Platform role** | `User.platformRole`: `USER`, `ORGANIZER`, `ADMIN` — gates who can create orgs/events |
| **Org ownership** | `OrganizationMember.role === "owner"` — can manage events for that org |
| **Event staff** | `EventStaffMember` + `EventStaffRoleLink` → `EventRoleDefinition.slug` (`organizer`, `registrar`, `treasurer`, `judge`, …) |
| **Permission helpers** | `canManageEvent()` — admin, organizer staff slug, or org owner |
| | `canManageEventRegistrations()` — organizer, registrar, treasurer staff, or `canManageEvent` |
| | `canEditEvent()` / `isEventOrganizer()` — permission-layer checks on role arrays |

### How the app knows which events a user manages

- **My Events → Managing tab** (`/dashboard/events?tab=managing`): any `EventStaffMember` row (all staff roles)
- **Edit Event button**: only shown when staff role slug is `organizer` (`ManagingCard`)
- **Registrations button**: shown for `organizer` or `treasurer` staff roles
- **Edit page auth**: `canManageEvent(userId, eventId, orgId, platformRole)` — broader than organizer slug alone (includes org owners + admin)

### Sensitive UI routes (today)

| Route | Auth check | Gate in v1? |
| --- | --- | --- |
| `/dashboard/events?tab=managing` | staff membership list | **No** — list only |
| `/organizer/events/[id]/edit` | `canManageEvent` | **Yes** |
| `/organizer/events/[id]/registrations` | `canManageEventRegistrations` | **Yes** |
| `/organizer/events/[id]/registrations/[registrationId]` | same | **Yes** |
| `/organizer/events/[id]/reports` | `canManageEvent` | **Yes** |
| `/organizer/events/[id]/messages` | organizer messaging | **Yes** |
| `/organizer/events/new` | create flow | **No** |
| `/organizer/events/[id]/staff`, `/tiers`, `/organization`, `/dash-cards` | various | **No** (v1) |

### Sensitive API routes (today)

Under `/api/events/[id]/`:

- **Registration PII**: `registrations/[registrationId]`, `registrations/export`, `registrations/bulk`, `sync-payment`, staff-photo view routes
- **Event config mutations**: `route.ts` (PATCH), `payment-settings`, `sponsor`, `charity`, `categories`, `tiers`, `awards`, `sms-voting`, `clone`, `upload`, `staff`, `transfer-organizer`, etc.

### Existing patterns to reuse

| Pattern | Use for OTP step-up |
| --- | --- |
| **Admin MFA** | Supabase TOTP + AAL2; middleware via `/api/auth/session-guards`; `requireAdminMfaSession()` for APIs |
| **Idle session** | HttpOnly signed cookie `css_last_activity`; cleared on logout + idle logout |
| **SendGrid** | `src/lib/email/sendgrid.ts` transactional email helper |
| **Middleware** | `updateSession()` — extend with organizer step-up redirects (parallel to admin MFA) |

---

## Approved security model (final)

### Site Admin — no organizer email OTP

Site Admins must **never** be required to complete organizer email OTP when accessing Edit Event, Registrations, Reports, Messages, or other organizer-sensitive screens.

| Control | Behavior |
| --- | --- |
| **Login** | Password + Supabase authenticator/TOTP MFA (existing admin MFA flow) |
| **Session** | 60-minute inactivity logout (existing idle timeout) |
| **Sensitive access** | Once login + MFA (AAL2) is complete for the current session, **no additional step-up** |
| **Stacking** | Do **not** require both admin MFA and organizer email OTP |

**Implementation rule:** If `platformRole === ADMIN` and Supabase session is **AAL2**, treat step-up as **satisfied** for all sensitive organizer/event-management routes and APIs. Admins without AAL2 continue to use the **existing admin MFA challenge** (`/login/mfa`) — not the organizer email OTP page.

### Event staff / organizers — email OTP step-up

| Control | Behavior |
| --- | --- |
| **Who** | Any user who can access sensitive event-management data (see below) **except** Site Admins with valid AAL2 |
| **When** | Once per login session, before first access to gated areas |
| **Delivery** | 6-digit code via SendGrid to verified account email |
| **Cleared on** | Logout, inactivity logout, new login |

### Final access rule (single gate)

Sensitive organizer/event-management access requires **one** of:

1. **Site Admin** with completed Supabase MFA / **AAL2** session, **or**
2. **Staff/organizer user** with completed **email OTP step-up** for the current login session

Do not stack both for Site Admin.

---

## v1 scope decisions (approved)

### 1. Who must complete email OTP step-up?

Any user with access to attendee registration or sensitive event-management information:

- Passes `canManageEventRegistrations(userId, eventId, platformRole)`, **or**
- Has event staff role slug: **organizer**, **registrar**, or **treasurer**, **or**
- Passes `canManageEvent()` for event config areas (edit event, etc.)

**Excluded from email OTP:**
- Site Admins with AAL2 (MFA satisfies step-up)
- Plain attendees, public users, judge-only staff on public `/v/*` voting pages
- Users with no sensitive event-management permission

**Included in email OTP (v1):**
- Organizer, registrar, treasurer staff
- Org owners with registration/event management access
- Platform `ORGANIZER` role users managing events

### 2. Reports — yes, protected

Require step-up for:

- `/organizer/events/[id]/reports` (all report types — voting tabulation, future registration/operational reports)
- Any related report APIs that return attendee, registration, voting/judging, or operational event data

### 3. Organizer messages — yes, protected

Require step-up for:

- `/organizer/events/[id]/messages` (participant/registrant communications and contact context)

### 4. Not gated (unchanged)

- `/dashboard/events?tab=managing` — event list only, no attendee PII
- `/organizer/events/new` — create flow, no registrant data yet
- Public `/events/*`, `/v/*` voting, attendee dashboard, guest registration

---

## Design

### Purpose-based model (future-proof)

```ts
enum StepUpPurpose {
  ORGANIZER_STEP_UP = "ORGANIZER_STEP_UP", // v1: all staff sensitive access
  // future: REGISTRAR_STEP_UP, TREASURER_STEP_UP, JUDGE_STEP_UP (split policies if needed)
}
```

v1 uses a single purpose (`ORGANIZER_STEP_UP`) for all staff step-up; policy function determines *who* needs it.

### Prisma models

**`StepUpOtpChallenge`**
- `id`, `userId`, `purpose` (enum), `codeHash`, `expiresAt`, `attempts`, `maxAttempts` (default 5), `consumedAt`, `lastSentAt`, `createdAt`
- Index: `(userId, purpose, consumedAt)`

**`StepUpAuditLog`**
- `id`, `userId`, `eventId?`, `purpose`, `action` (REQUESTED, VERIFIED, FAILED, EXPIRED, RATE_LIMITED, ACCESS_DENIED), `route?`, `ip?`, `userAgent?`, `createdAt`

### Session verification cookie

- HttpOnly cookie: `css_step_up_organizer` (maps to `ORGANIZER_STEP_UP`)
- **Signed payload** (HMAC-SHA256): `{ userId, sessionId, purpose, verifiedAt }`
- `sessionId` from Supabase access token — invalidates on logout/login/session rotation
- Cleared on: logout, inactivity logout, new login
- **Not** stored in localStorage
- **Never set for Site Admin** — admins rely on AAL2 only

### OTP security

- 6-digit code via `crypto.randomInt`
- **bcrypt** hash — never plaintext
- Expires **10 minutes**; resend cooldown **60 seconds**; max **5 attempts** per code
- Generic errors; no user enumeration
- Send only to **Supabase-verified email**
- Never log OTP codes

### Guard flow

```
User → sensitive page/API
  → authenticated?
  → has permission for this event/route?
  → Site Admin + AAL2? → ALLOW (no email OTP)
  → Site Admin + not AAL2? → existing admin MFA flow (/login/mfa) — NOT organizer OTP
  → staff/organizer + valid step-up cookie for session? → ALLOW
  → staff/organizer + no step-up? →
      page: redirect /organizer/verify-otp?next=…&eventId=…
      API: 403 { code: "ORGANIZER_OTP_REQUIRED" }
```

### Central policy helper

```ts
async function isSensitiveAccessSatisfied(ctx): Promise<boolean> {
  if (isSiteAdmin(user) && mfa.currentLevel === "aal2") return true;
  if (isSiteAdmin(user)) return false; // handled by admin MFA middleware, not OTP
  if (!userNeedsStaffStepUp(user, eventId, route)) return true; // no sensitive access
  return hasValidStepUpCookie(request, user, ORGANIZER_STEP_UP);
}
```

---

## Implementation phases

### Phase 1 — Schema & core library
- [x] Prisma enum `StepUpPurpose` + models `StepUpOtpChallenge`, `StepUpAuditLog` + migration
- [x] `src/lib/step-up-config.ts` — OTP length, expiry, cooldown, max attempts
- [x] `src/lib/step-up-session.ts` — sign/verify/clear HttpOnly cookie, bind to Supabase session id
- [x] `src/lib/step-up-otp.ts` — generate, hash, verify, consume challenges
- [x] `src/lib/organizer-step-up-policy.ts` — sensitive path/API matchers, admin AAL2 bypass
- [x] `src/lib/step-up-audit.ts` — audit writes (no secrets)
- [x] Unit tests for policy matchers, OTP verify, cookie signing

### Phase 2 — Email
- [x] `sendOrganizerStepUpOtpEmail({ to, recipientName, code, expiresInMinutes })` in `sendgrid.ts`
- [x] Subject: “Your CarShowScout organizer verification code”
- [x] Dedicated HTML/text template (not password reset)

### Phase 3 — API routes
- [x] `POST /api/organizer/otp/send` — reject site admins (they use MFA); create/resend challenge for staff
- [x] `POST /api/organizer/otp/verify` — verify code, set step-up cookie, audit
- [x] `GET /api/organizer/otp/status` — masked email, cooldown, verified flag

### Phase 4 — Challenge UI
- [x] `/organizer/verify-otp` page + mobile-friendly form
- [x] Copy: *“For your attendees’ privacy, please verify your account before accessing event management information.”*
- [x] Masked email, 6-digit input, resend after 60s cooldown, friendly errors
- [x] **No admin “use authenticator” link on this page** — admins are redirected through admin MFA, not organizer OTP
- [x] `next` + `eventId` via `safeInternalPath`

### Phase 5 — Route guards

**Middleware** (page redirects):
- [x] Sensitive `/organizer/events/[id]/…` paths (see list below)
- [x] Exclude `/organizer/verify-otp`, `/login`, `/login/mfa`, `/api/organizer/otp/*`
- [x] Admin AAL2 → pass through; staff without step-up → redirect to verify-otp

**Page helpers:** `requireStaffStepUpPage()` on gated server pages

**API helper:** `requireStaffStepUpApi()` → `403 ORGANIZER_OTP_REQUIRED` (middleware handles API 403)

**Sensitive page paths (v1)**:
- `/organizer/events/[id]/edit`
- `/organizer/events/[id]/registrations`
- `/organizer/events/[id]/registrations/[registrationId]`
- `/organizer/events/[id]/reports`
- `/organizer/events/[id]/messages`

**Sensitive API paths (v1)** — under `/api/events/[id]/`:
- `registrations/**` (all registration/attendee PII)
- `route.ts` PATCH (event config)
- `payment-settings`, `sponsor`, `charity`, `categories`, `tiers/**`, `awards/**`, `sms-voting`, `clone`, `upload`, `staff/**`, `transfer-organizer`
- Staff-photo view routes
- Report-related APIs (as added / identified)
- `/api/messages/**` when scoped to event organizer messages with participant data

**Not gated:**
- `/dashboard/events`, `/organizer/events/new`, public routes, `/v/*`, attendee APIs

### Phase 6 — Session lifecycle
- [x] Clear step-up cookie on logout + idle logout
- [x] Exclude OTP routes from background idle-touch issues
- [x] Ensure admin MFA middleware runs before/alongside step-up (admins never hit OTP)

### Phase 7 — Tests & docs
- [x] `docs/organizer-otp-test-checklist.md` (include admin-no-OTP, registrar/treasurer, reports, messages)
- [x] Unit tests
- [x] `npm run build`

---

## Verification matrix (approved)

| User | Sensitive area | Required |
| --- | --- | --- |
| Public / attendee | Any | None |
| Judge only | Public `/v/*` | None |
| Organizer / registrar / treasurer staff | Edit, Registrations, Reports, Messages | Email OTP once per session |
| Org owner (no admin) | Same | Email OTP once per session |
| **Site Admin + AAL2** | All organizer-sensitive screens | **None** (MFA only) |
| **Site Admin, not AAL2** | Admin routes | Admin MFA (`/login/mfa`) — **not** organizer OTP |
| Staff after logout / idle logout | Any sensitive | Email OTP again |
| Staff same session, OTP done | Any sensitive | None until logout |

---

## Files (expected)

**New**
- `prisma/migrations/…_step_up_otp/`
- `src/lib/step-up-config.ts`, `step-up-session.ts`, `step-up-otp.ts`, `organizer-step-up-policy.ts`, `step-up-audit.ts`
- `src/lib/require-organizer-step-up.ts`
- `src/app/organizer/verify-otp/page.tsx`, `organizer-verify-otp-form.tsx`
- `src/app/api/organizer/otp/send/route.ts`, `verify/route.ts`, `status/route.ts`
- `docs/organizer-otp-test-checklist.md`

**Modified**
- `prisma/schema.prisma`, `sendgrid.ts`, `middleware.ts`, logout + idle logout, gated pages/APIs, `session-activity-policy.ts`

---

## Review (fill in after implementation)

Organizer email OTP step-up is implemented end-to-end.

**What shipped**
- DB: `StepUpOtpChallenge`, `StepUpAuditLog` (migration `20260530210000_step_up_otp`)
- Core libs: config, crypto (scrypt OTP + HMAC cookie), session cookie bound to Supabase `session_id`, OTP challenge flow, path policy, audit logging
- Email: `sendOrganizerStepUpOtpEmail()` via SendGrid
- APIs: `POST /api/organizer/otp/send|verify`, `GET /api/organizer/otp/status`
- UI: `/organizer/verify-otp` with auto-send, resend cooldown, masked email
- Guards: middleware via extended `/api/auth/session-guards` + `requireStaffStepUpPage()` on 5 sensitive pages
- Session: step-up cookie cleared on logout and idle logout; OTP routes excluded from idle timer reset
- Tests: `organizer-step-up-policy.test.ts`, `step-up-crypto.test.ts`; manual checklist in `docs/organizer-otp-test-checklist.md`

**Access rules**
- Site admin + AAL2 → no OTP
- Site admin + enrolled MFA, not AAL2 → `/login/mfa` (never organizer OTP)
- Site admin without MFA enrolled → allowed (same as admin routes)
- Staff (organizer/registrar/treasurer) → email OTP once per login session for sensitive pages/APIs

**Optional env:** `STEP_UP_COOKIE_SECRET` (documented in `.env.example`; falls back to service role key)

---

## API refresh / polling reduction (2026-05-23)

### Problem
Background polls and edit-page `keepMounted` sections caused 7+ parallel GETs on every organizer edit page load, stacking with 20–30s polls while each request took 7–21s in dev.

### Changes
- [x] Unread count poll: 20s → 60s; skip interval when tab hidden (still refreshes on focus)
- [x] Session idle sync poll: 30s → 60s; skip when hidden; sync once when tab becomes visible
- [x] Event setup cards: removed `keepMounted` — sponsor/charity/categories/awards/SMS only fetch when section is expanded

### Review
Edit page now loads zero setup-section API calls until the user opens a card. Per logged-in user, background traffic drops from ~3 polls/min to ~2 polls/min, and polls pause in background tabs.

---

## SWR caching + API latency profiling (2026-05-23)

### Client caching (done)
- [x] Added `swr` with 5-minute `dedupingInterval` via `SWRProvider` in root layout
- [x] Hooks in `src/hooks/use-event-setup-cache.ts` for sponsor, charity, categories, available-categories, awards, master awards
- [x] Event setup sections use shared cache; mutations update cache without refetch
- [x] Re-opening a section within 5 minutes = zero network requests

### Server latency investigation (findings)

**Why 7–21s `application-code` in dev:**

1. **Single Prisma connection (main culprit under load)** — `src/lib/db.ts` sets `connection_limit=1` when using Supabase pgbouncer. Parallel API calls (8+ on edit page) **queue on one DB connection**, so total wall time ≈ sum of individual query times.

2. **Duplicate Supabase auth per request** — Middleware calls `supabase.auth.getUser()`, then each API route calls `getCurrentUser()` → another `getUser()`. ~150–360ms `proxy.ts` + ~1–3s auth each time.

3. **Redundant DB round trips in handlers** — Sponsor/charity GET used to call `canManageEvent()` (extra `event.findUnique`) then fetch data again. **Fixed:** one `event.findUnique` with `orgId` + fields, then auth with `orgIdHint`.

4. **Remote Supabase latency in dev** — Each auth + DB hop is a network round trip to hosted Postgres/Auth, not local.

**Profiling tool:** Set `REQUEST_TIMING=1` in `.env.local` and restart dev. Terminal logs breakdown like:
```
[request-timing] auth.getSession 820ms
[request-timing] auth.prismaUserLookup 1200ms
[request-timing] api.events.sponsor.GET 4100ms
```

**Recommended next steps (not implemented — higher risk):**
- Use Supabase **session mode** pooler (port 5432) for dev, or carefully raise `connection_limit` if pool allows
- Pass auth user from middleware to routes (Next.js 16 header/cookie pattern) to skip second `getUser()`
- Batch event setup into one `/api/events/[id]/setup` endpoint for initial load
