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

---

## Vehicle Available for Sale — implementation plan (2026-05-23)

**Status:** Phase 2 complete — Phase 3 next (dash card sale badge + QR).

### Current codebase (inspection summary)

| Area | What exists today |
|------|-------------------|
| **Vehicle entry identity** | `RegistrationVehicle.publicVehicleId` (e.g. `AXY-004`) = `vehicleEntryCode` for voting/judging QR, SMS, `/v/[vehicleEntryCode]` smart route |
| **Guest vehicles** | Stored in `Registration.guestVehicles` JSON with `publicVehicleId`; unified via `findVehicleEntryByCode()` in `vehicle-entry-lookup.ts` |
| **Dash cards** | `DashCardPreview` + `loadDashCardModelsForRegistrations()`; sidebar shows Owner + **Location** (city/state only — no email/phone); vote QR points to smart route |
| **Registration UI** | Logged-in: `event-registration-page.tsx` + `AddVehicleForm`; guest: `guest-registration-form.tsx` |
| **Event settings** | `EventForm` on organizer edit page; SMS voting toggle in `EventSmsVotingSettings` collapsible |
| **Email** | SendGrid in `src/lib/email/sendgrid.ts`; pattern for transactional emails |
| **Uploads** | R2 via `upload-destinations.ts`; public photos under `events/{eventId}/...` |
| **Rate limiting** | No generic API rate limiter yet; OTP has rate limits; will add sale-inquiry-specific limits |

**Privacy already OK on dash cards:** Owner line is display name + city/state only — no email/phone on card.

**QR token choice:** Reuse **`vehicleEntryCode`** (`publicVehicleId`) for sale URL — already on dash card, not a raw DB UUID, unique per event. Route: **`/v/[vehicleEntryCode]/sale`**.

---

### Proposed Prisma schema

```prisma
enum VehicleSaleInquiryStatus {
  NEW
  SENT_TO_OWNER
  FAILED_TO_SEND
  SPAM
  ARCHIVED
  CONTACTED
}

// Event — add field:
// vehicleSaleInquiriesEnabled Boolean @default(false)

model VehicleSaleListing {
  id                    String   @id @default(uuid())
  eventId               String
  registrationId        String
  registrationVehicleId String?  @unique  // logged-in entries
  guestVehicleIndex     Int?              // guest JSON index (0-based)
  sellerUserId          String?           // null for guest registrants
  enabled               Boolean  @default(false)
  askingPriceCents      Int?
  showAskingPricePublicly Boolean @default(false)
  allowOffers           Boolean  @default(false)
  minimumOfferCents     Int?
  description           String?  @db.Text
  sellerAcknowledgedAt  DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  event          Event          @relation(...)
  registration   Registration   @relation(...)
  registrationVehicle RegistrationVehicle? @relation(...)
  seller         User?          @relation(...)
  photos         VehicleSalePhoto[]
  inquiries      VehicleSaleInquiry[]

  @@unique([registrationId, guestVehicleIndex])
  @@index([eventId, enabled])
  @@index([sellerUserId])
}

model VehicleSalePhoto {
  id               String @id @default(uuid())
  listingId        String
  publicUrl        String
  objectKey        String @unique
  sortOrder        Int    @default(0)
  originalFilename String?
  contentType      String?
  createdAt        DateTime @default(now())
  listing VehicleSaleListing @relation(...)
  @@index([listingId, sortOrder])
}

model VehicleSaleInquiry {
  id                    String @id @default(uuid())
  listingId             String
  eventId               String
  sellerUserId          String?
  registrationVehicleId String?
  guestVehicleIndex     Int?
  buyerName             String
  buyerEmail            String
  buyerPhone            String?
  offerAmountCents      Int?
  message               String? @db.Text
  consentAt             DateTime
  status                VehicleSaleInquiryStatus @default(NEW)
  ipHash                String?
  userAgentHash         String?
  submittedAt           DateTime @default(now())
  notificationEmailSentAt DateTime?
  notificationSmsSentAt   DateTime?
  contactedAt           DateTime?

  listing VehicleSaleListing @relation(...)
  @@index([listingId, submittedAt])
  @@index([sellerUserId, status])
  @@index([eventId])
}
```

**Listing key:** One listing row per vehicle entry (either `registrationVehicleId` OR `registrationId` + `guestVehicleIndex`).

**Guest sellers:** `sellerUserId` null; notify `registration.guestEmail`. Logged-in sellers: notify `user.email`.

---

### Phased todos

#### Phase 1 — Schema + event setting
- [x] Migration: models above + `Event.vehicleSaleInquiriesEnabled` default `false`
- [x] Add upload purpose `vehicleSalePhoto` → `events/{eventId}/sale-listings/{listingId}/`
- [x] Event PATCH/API + organizer toggle: “Allow vehicle owners to mark vehicles as available for sale” (`EventVehicleSaleSettings` on edit page)
- [x] Clone event: copy setting; default off for existing events (migration default handles this)
- [x] `npm run build` passes after Phase 1

#### Phase 2 — Registration sale opt-in
- [x] Zod schema: `vehicleSaleListingSchema` (optional per vehicle)
- [x] Logged-in registration UI (`event-registration-page.tsx`): collapsible “Owner Accepting Inquiries” per registered vehicle when event enabled
- [x] Guest registration UI (`guest-registration-form.tsx`): same fields per vehicle row
- [x] Organizer edit registration: same fields (member + guest)
- [x] POST/PATCH register routes: upsert `VehicleSaleListing` + photos; require `sellerAcknowledgedAt` when enabled
- [x] Do not block registration if sale section empty
- [x] `npm run build` passes after Phase 2

#### Phase 3 — Dash card sale badge + QR
- [x] Extend `DashCardModel` with optional `sale?: { badgeLabel; salePageUrl; qrImageUrl }`
- [x] When listing enabled + event setting on: replace Location row with **“Owner Accepting Inquiries on this Vehicle”**
- [x] Add sale QR panel (separate from vote QR): “Scan for vehicle listing details” → `/v/{code}/sale`
- [x] Generate sale QR via existing `ensureVehicleQrsForEntryCodes` pattern (new purpose or second QR file)
- [x] Print layout: keep vote QR unchanged; add sale block only when applicable

#### Phase 4 — Public sale inquiry page
- [x] `src/app/v/[vehicleEntryCode]/sale/page.tsx` — public, no auth
- [x] Load listing by entry code via `findVehicleEntryByCode` + listing join
- [x] Show: vehicle YMM, event name + show number, description, photos, asking price if public
- [x] **Never show:** owner email, phone, address, account id
- [x] Disclaimers (broker/not inspector/escrow)
- [x] Buyer form: name*, email*, phone (optional), offer (conditional), message, consent*
- [x] Honeypot field (hidden)
- [x] Confirmation page after submit (`/sale/sent`)

#### Phase 5 — Inquiry save + SendGrid email
- [x] `POST /api/v/[vehicleEntryCode]/sale/inquiry` — validate, save inquiry
- [x] `sendVehicleSaleInquiryEmail()` in sendgrid.ts
- [x] SMS placeholder: `notifyVehicleSaleInquirySms()` no-op unless `TWILIO_SMS_OUTBOUND_ENABLED=1` (future)
- [x] Update inquiry status `SENT_TO_OWNER` / `FAILED_TO_SEND`
- [x] Email link → `/dashboard/sale-inquiries/[id]` (seller) or guest email only

#### Phase 6 — Owner dashboard
- [x] `/dashboard/sale-inquiries` — list inquiries for `sellerUserId = me`
- [x] Detail view: buyer contact, offer, message, event/vehicle context
- [x] Actions: Mark contacted, Archive
- [x] Nav link from dashboard sidebar

#### Phase 7 — Admin / organizer reporting
- [x] Admin: `/admin/sale-inquiries` — all inquiries, full buyer details
- [x] Organizer: event registrations summary — count for-sale vehicles + inquiry count (no buyer PII)
- [x] Optional: widget on organizer registrations page

#### Phase 8 — Abuse prevention + tests
- [x] Rate limit: max N inquiries per listing/IP/email per hour (in-memory or DB window)
- [x] `ipHash` / `userAgentHash` (sha256 truncated, no raw IP storage)
- [x] Tests: validation, rate limit, email skip when SendGrid off, listing upsert
- [x] Manual checklist: `docs/vehicle-sale-inquiry-test-checklist.md`
- [x] `npm run build`

---

### Compatibility guardrails

- Sale fields hidden when `vehicleSaleInquiriesEnabled === false`
- No sale QR when disabled or listing not enabled
- Voting/judging smart route `/v/[code]` unchanged
- Stripe checkout, OTP, MFA, idle logout untouched
- Guest + logged-in + existing entries supported via dual listing key

---

### Open decisions (approved 2026-05-23)

1. **Sale URL:** `/v/[vehicleEntryCode]/sale`
2. **Buyer phone:** optional in v1
3. **Organizer visibility:** counts only — no buyer PII
4. **Notifications:** SendGrid email now; SMS placeholder fields only (Twilio outbound not approved)
5. **Dash card wording:** “Owner Accepting Inquiries” (not “Vehicle Available for Sale”)
6. **Public disclaimer:** CarShowScout is not broker/dealer/escrow/inspector/appraiser
7. **Existing events:** `vehicleSaleInquiriesEnabled` defaults `false`
8. **Guest sellers:** email notifications only; dashboard later if account claimed

---

### Phase 1 review (2026-05-23)

**Schema & migration**
- Added `VehicleSaleInquiryStatus` enum, `VehicleSaleListing`, `VehicleSalePhoto`, `VehicleSaleInquiry` models
- Added `Event.vehicleSaleInquiriesEnabled Boolean @default(false)` — existing events stay off
- Migration `20260530220000_vehicle_sale_listings` applied via `npm run db:migrate:deploy`

**API & validation**
- `GET/PATCH /api/events/[id]/vehicle-sale-settings` with organizer step-up guard
- `vehicleSaleSettingsSchema` + unit tests

**Organizer UI**
- `EventVehicleSaleSettings` collapsible card on event edit page (setup list cards)
- Toggle copy explains owners opt in per vehicle; includes broker disclaimer

**Uploads**
- `vehicleSalePhoto` purpose → `events/{eventId}/sale-listings/{listingId}/`

**Build:** `npm run build` passes.

---

### Phase 2 review (2026-05-23)

**Validation & sync**
- `vehicleSaleListingInputSchema` + tests; optional on register/guest/organizer schemas
- `sync-vehicle-sale-listings.ts` upserts listings for logged-in and guest vehicles
- Photo upload: `POST /api/events/[id]/vehicle-sale-listing-photo/upload`

**UI**
- `VehicleSaleListingFields` — “Owner accepting inquiries” per vehicle with broker disclaimer
- Logged-in, guest, and organizer guest edit flows; hidden when event setting is off
- Registration not blocked when sale section is empty/disabled

**Routes:** register, register-guest, organizer PATCH registration

**Build:** `npm run build` passes.

---

### Phase 3 review (2026-05-23)

**Types & URLs**
- `DashCardSaleModel` on `DashCardModel.sale` (`badgeLabel`, `salePageUrl`, `qrImageUrl`)
- `vehicleSalePageUrl()` → `/v/{code}/sale`

**Data loading**
- `loadDashCardModelsForRegistrations` batch-loads enabled + acknowledged sale listings when `event.vehicleSaleInquiriesEnabled`
- Maps by `registrationVehicleId` or `guestVehicleIndex`; no sale block when event off or listing disabled

**Sale QR**
- `ensureVehicleSaleQrForStorage` uploads `sale-qr.svg` (R2) with inline SVG fallback — separate from vote QR
- `attachSaleQrsToDashCards` mirrors vote QR batch pattern

**UI & print**
- Sidebar: Location row replaced with listing badge when `sale` present
- Vote column: vote panel unchanged; sale QR moved to **left sidebar** below listing badge with “Scan for vehicle listing details”
- Print CSS stacks panels; smaller sale QR when both present
- Sample preview data includes sale block for `/dash-card-preview`

**Tests:** `dash-card-qr-url.test.ts` covers sale URL path.

**Build:** `npm run build` passes.

---

### Phase 5 review (2026-05-31)

**Inquiry pipeline**
- `POST /api/v/[vehicleEntryCode]/sale/inquiry` saves inquiry with ipHash / userAgentHash
- Email via `sendVehicleSaleInquiryEmail`; status `SENT_TO_OWNER` or `FAILED_TO_SEND`

**SMS placeholder**
- `notifyVehicleSaleInquirySms()` in `lib/sms/vehicle-sale-inquiry-sms.ts` — no-op unless `TWILIO_SMS_OUTBOUND_ENABLED=1`

**Owner email**
- Logged-in sellers (`sellerUserId` set): email includes dashboard link `/dashboard/sale-inquiries/[id]`
- Guest sellers: email with buyer contact only (no dashboard link)

---

### Phase 6 review (2026-05-31)

**Dashboard**
- `/dashboard/sale-inquiries` — list for `sellerUserId = current user` (archived hidden)
- `/dashboard/sale-inquiries/[id]` — buyer contact, offer, message, event/vehicle context
- `PATCH /api/dashboard/sale-inquiries/[id]` — mark contacted, archive

**Nav**
- **Sale Inquiries** tile on main dashboard grid

**Build:** `npm run build` passes.

---

### Phase 7 review (2026-05-31)

**Admin**
- `/admin/sale-inquiries` — all inquiries with buyer email, event/vehicle context
- `/admin/sale-inquiries/[id]` — full buyer contact, offer, message, delivery/audit fields (IP hash, user-agent hash)
- Nav link in admin layout

**Organizer**
- `loadEventSaleInquiryStats()` — for-sale vehicle count + inquiry count (excludes spam/archived)
- `EventSaleInquirySummary` widget on organizer registrations page when sale inquiries are enabled
- No buyer PII shown to organizers

**Build:** `npm run build` passes.

---

### Phase 8 review (2026-05-23)

**Abuse prevention**
- `hashSaleInquiryClientValue()` — shared SHA-256 truncated hash for IP and user-agent (no raw IP stored)
- `checkVehicleSaleInquiryRateLimits()` — DB window: 5/listing/hr, 5/email/hr, 10/ipHash/hr; excludes `SPAM` status
- Inquiry API returns 429 when limits exceeded; honeypot unchanged from Phase 4
- Validation rejects negative offer strings (e.g. `-100`) before currency parsing

**Tests**
- `vehicle-sale-inquiry.test.ts` — schema + buyer name formatter
- `vehicle-sale-inquiry-rate-limit.test.ts` — mocked Prisma rate-limit windows
- `vehicle-sale-inquiry-client-hash.test.ts` — hash stability and truncation
- `vehicle-sale-listing.test.ts` — extended with `normalizeVehicleSaleListingInput`
- `sendgrid.test.ts` — `sendVehicleSaleInquiryEmail` skip when SendGrid off

**Docs**
- `docs/vehicle-sale-inquiry-test-checklist.md` — manual QA checklist for full feature

**Build:** `npm run build` passes. Phase 8 unit tests pass (27 tests in scope).

---

### Review (vehicle sale inquiry feature — complete)

Phases 1–8 complete. Owners can opt in per vehicle when the event enables sale inquiries; dash cards show a sale QR and badge; buyers submit inquiries on the public sale page; owners receive email (and optional future SMS); logged-in sellers manage inquiries in the dashboard; admins see full PII; organizers see counts only. Abuse controls: honeypot, rate limits, hashed client metadata, negative-offer validation.

---

# Award & Judging Architecture — Phase 1A + 1B (in progress)

**Full spec:** [judging-template-architecture-plan.md](./judging-template-architecture-plan.md)

## Summary

Three **separate** award workflows (additive, no breaking changes):

| Workflow | Status | Models |
|----------|--------|--------|
| **Public Voting** | Existing | `VotingCategory`, `VehiclePublicVote`, `SmsVote` |
| **Structured Score Sheet Judging** | Phase 1A done | `JudgingTemplate` → `EventJudgingTemplate` → `JudgeScoreSheet` |
| **Assigned Judge Ballot Voting** | Phase 1B done | `JudgeBallotCategory` → `JudgeBallotAllocation` → `JudgeBallotVote` |

**Naming:** `EventCategory` = registration class. `JudgeBallotCategory` = award like Best Paint (not the same). Workflows #2 and #3 do **not** share data tables.

## Todo

### Phase 0 — Review
- [x] User approves combined plan

### Phase 1A — Score sheet schema + seed
- [x] Global + event judging template tables + score sheet snapshots
- [x] Migration SQL + `db push` on dev (`20260601120000_judging_and_ballot`)
- [x] Seed 4 global templates (`npm run db:seed-judging-templates`)
- [x] `clone-judging-template-to-event.ts` + `calculate-score.ts` + tests
- [x] `snapshot-score-sheet.ts` (template → score sheet snapshot)

### Phase 1B — Judge ballot schema
- [x] `JudgeBallotCategory`, eligible classes, judge assignments, allocations, votes
- [x] Migration (same migration file)
- [x] `judge-ballot-validation.ts` + allocation sync + results aggregation + tests
- [x] Minimal API routes (admin templates, clone, ballot CRUD, judge vote upsert, results)

### Phase 1C — Backend verification
- [x] Integration test suite `phase-1c-integration.test.ts` (`npm run test:judging-integration`)
- [x] Clone flow verified (structure, intentional separate copies, 60s transaction timeout)
- [x] Snapshot immutability + DEDUCTION/ADDITIVE/ORIGINALITY_CONDITION from snapshots
- [x] Ballot create/open/vote/close/results + eligibility + judge assignment
- [x] Compatibility imports (legacy judge score, SMS voting, entry lookup)

### Phase 2A — Organizer: Awards & Judging hub
- [x] `/organizer/events/[id]/awards-judging` hub with three tiles
- [x] Terminology labels (Vehicle Class, Award Category, Voting Method)
- [x] Nav tab "Awards & Judging" on event organizer nav
- [x] Public voting sub-page (existing SMS settings)

### Phase 2B — Organizer: judge ballot admin UI
- [x] `/organizer/events/[id]/awards-judging/ballot`
- [x] Create/edit award categories (DRAFT)
- [x] votesPerJudge, maxPerVehicle, eligible vehicle classes, judge assignment
- [x] Open / Close / Finalize actions
- [x] Ranked results table per category

### Phase 2C — Judge mobile ballot UI
- [x] `/judge` — My Judging Assignments hub
- [x] `/judge/events/[id]/ballot` — award category list
- [x] `/judge/events/[id]/ballot/[catId]` — mobile voting screen with sticky footer
- [x] Judge APIs: assignments, ballot list/detail, vehicle entry lookup
- [x] Auto-save via existing PUT votes endpoint; read-only when CLOSED/FINALIZED
- [x] Client + integration tests

### Phase 2D — Structured Score Sheet Organizer UI
- [x] `/organizer/events/[id]/awards-judging/score-sheets` — template builder UI
- [x] Clone global templates → event `EventJudgingTemplate`
- [x] Edit sections, criteria, deductions, guidance with edit-lock rules
- [x] Running total + mismatch warnings
- [x] Read-only judge form preview
- [x] `EventJudgingClass` CRUD + vehicle class mapping
- [x] APIs + integration tests

### Phase 2E — Judge mobile score sheet UI
- [x] Judge assignments API: include score sheet assignment counts per event
- [x] Judge hub UI (`/judge`): show Score Sheet Judging section per event
- [x] Judge event score sheet list route (`/judge/events/[id]/score-sheets`)
- [x] Judge score sheet detail route (`/judge/events/[id]/score-sheets/[sheetId]`)
- [x] Judge APIs for score sheets:
  - [x] `GET /api/judge/events/[id]/score-sheets` (list)
  - [x] `GET /api/judge/events/[id]/score-sheets/[sheetId]` (detail)
  - [x] `PATCH /api/judge/events/[id]/score-sheets/[sheetId]` (save draft points/deductions/notes)
  - [x] `POST /api/judge/events/[id]/score-sheets/[sheetId]/submit` (mark submitted + compute final score)
- [x] Score calculation integration using snapshot model (`calculateScoreFromSnapshot`)
- [x] Mobile UX:
  - [x] sticky footer with running total / max points
  - [x] large tap targets for quick scoring
  - [x] collapsible guidance blocks
  - [x] clear read-only state after submit/finalize
- [x] Focused regression tests (judge score sheet API/service + no impact to judge ballot/public vote)
- [x] Manual verification notes + Phase 2E review section update

### Phase 4A — Score sheet results + CSV

### Phase 4B — Judge ballot results (ranked, tie indicator, admin vote spread)

### Phase 5 — Polish (DnD, event clone, deprecate legacy 1–100)

## Review (Phase 1A + 1B)

**Schema:** Added enums and models for structured score sheet judging (global `JudgingTemplate` tree → event `EventJudgingTemplate` copy → `JudgeScoreSheet` snapshots) and assigned judge ballot voting (`JudgeBallotCategory` → `JudgeBallotAllocation` → `JudgeBallotVote`). Migration file at `prisma/migrations/20260601120000_judging_and_ballot/migration.sql`; dev DB synced via `db push`.

**Seed:** Four global templates — PCA (300), AACA (400), Marque Authenticity (700), Modified/Custom (700). Run `npm run db:seed-judging-templates`.

**Services:**
- `src/lib/judging/clone-judging-template-to-event.ts` — transactional global → event clone
- `src/lib/judging/calculate-score.ts` — pure scoring by methodology
- `src/lib/judging/snapshot-score-sheet.ts` — event template → score sheet snapshot
- `src/lib/judging/judge-ballot-validation.ts` — vote limit rules (total, per-vehicle, eligibility, OPEN-only edits)
- `src/lib/judging/judge-ballot-allocation.ts` — open/close category, allocation sync
- `src/lib/judging/judge-ballot-results.ts` — ranked results with tie flag; admin vote spread optional
- `src/lib/judging/upsert-judge-ballot-vote.ts` — validated vote upsert with allocation recompute

**API plumbing:**
- `GET /api/admin/judging-templates`
- `GET|POST /api/events/[id]/judging-templates` + `POST .../clone`
- `GET|POST /api/events/[id]/judge-ballot/categories` + `PATCH .../[catId]` (open/close/finalize)
- `PUT /api/judge/events/[id]/ballot/[catId]/votes`
- `GET /api/events/[id]/judge-ballot/results?categoryId=`

**Other:** `VehicleEntryRecord.eventCategoryId` added for ballot eligibility. Legacy `VehicleJudgeScore`, public/SMS voting unchanged.

**Tests:** 10 unit tests + 12 integration tests (`npm run test:judging-integration`). Build passes.

---

## Review (Phase 1C + 2A + 2B)

**Phase 1C:** Added `phase-1c-integration.test.ts` — 9 DB integration checks + 3 compatibility import checks. Fixed clone transaction timeout (60s) for remote Supabase. Added `calculate-score-from-snapshot.ts`. Extended ballot PATCH to update eligible classes and judge assignments in DRAFT.

**Phase 2A:** Hub at `/organizer/events/[id]/awards-judging` with three tiles (Public Voting, Judge Ballot Awards, Score Sheet Judging). New nav tab. Sub-pages for public voting (existing SMS settings) and score sheets (Phase 2D placeholder).

**Phase 2B:** Full ballot admin at `/organizer/events/[id]/awards-judging/ballot` — create/edit DRAFT categories, open/close/finalize, ranked results table with tie indicator.

---

## Review (Phase 2C)

**Routes:** `/judge`, `/judge/events/[id]/ballot`, `/judge/events/[id]/ballot/[catId]` — mobile-first layout (max-w-lg).

**APIs:** `GET /api/judge/assignments`, `GET /api/judge/events/[id]/ballot`, `GET /api/judge/events/[id]/ballot/[catId]`, `GET /api/judge/events/[id]/vehicle-entry`.

**UX:** Sticky votes-remaining footer, large tap targets, collapsible guidance, vehicle lookup preview, +/- controls, auto-save, offline warning, read-only when CLOSED/FINALIZED.

**Dashboard:** "My Judging" tile → `/judge`.

**Tests:** `judge-ballot-client-validation.test.ts`, `judge-ballot-judge-api.test.ts` (in `npm run test:judging-integration`).

### Phase 2C verification checklist (automated + code review)

| # | Check | Result |
|---|-------|--------|
| 1 | Organizer creates Assigned Judge Ballot award category | ✅ Phase 2B admin UI + ballot POST API |
| 2 | Category hidden from judges while DRAFT | ✅ `loadJudgeBallotCategoriesForEvent` filters OPEN only; test: "judge loads eligible OPEN categories only" |
| 3 | Category visible to assigned judges once OPEN | ✅ `openJudgeBallotCategory` + list test |
| 4 | Judge lookup by publicVehicleId / entry code | ✅ `GET /api/judge/events/[id]/vehicle-entry` + `findVehicleEntryByCode` |
| 5 | Eligible vehicle class rules enforced | ✅ `isVehicleEligibleForBallotCategory`; test: "blocks ineligible vehicle class" |
| 6 | Category-specific judge assignment enforced | ✅ `assertJudgeCanAccessBallotCategory`; test: "blocks non-assigned judge" |
| 7 | Votes auto-save correctly | ✅ PUT votes endpoint; voting screen debounced save |
| 8 | Votes remaining updates after add/increase/decrease/remove | ✅ allocation recompute in `upsertJudgeBallotVote`; test verifies votesUsed/remaining |
| 9 | Max votes per vehicle enforced | ✅ test: "blocks vote over allocation and per-vehicle max" |
| 10 | Votes read-only after CLOSED/FINALIZED | ✅ test: "blocks voting when category is closed"; `canEdit: false` |
| 11 | Admin results update after judge votes | ✅ Phase 1C "runs judge ballot create → open → vote → results flow" |
| 12 | Other workflows unaffected | ✅ Phase 1C compatibility import checks (legacy judge score, public vote, vehicle entry) |

---

## Review (Phase 2D)

**Schema:** Expanded `EventJudgingClass` with name, description, isActive, sortOrder. Added `EventJudgingClassEligibleCategory` junction (many vehicle classes → one judging class). Migration: `prisma/migrations/20260602120000_event_judging_class_expand/migration.sql`.

**Route:** `/organizer/events/[id]/awards-judging/score-sheets` — replaces Phase 2D placeholder.

**APIs:**
- `GET /api/events/[id]/judging-templates/source` — global templates for clone picker
- `GET|PATCH /api/events/[id]/judging-templates/[templateId]` — read/update metadata + edit-lock info
- `PUT /api/events/[id]/judging-templates/[templateId]/structure` — full structure save (respects lock)
- `GET|POST /api/events/[id]/judging-classes` + `PATCH|DELETE .../[classId]`

**Services:**
- `event-judging-edit-lock.ts` — OPEN / DRAFT_WARNING / LOCKED from score sheet statuses
- `event-judging-template-validation.ts` — section/item point mismatch warnings
- `event-judging-template-service.ts` — load, metadata update, structure replace
- `event-judging-class-service.ts` — judging class CRUD + eligible vehicle class mapping

**UI:** Accordion sections via `CollapsibleCard`, inline deduction editing, collapsible judge guidance, running total warnings, read-only preview, judging class panel with judge-assignment placeholder for Phase 2E.

**Tests:** 3 validation unit tests + 6 Phase 2D integration tests. Full suite: **27/27 passing**. Build passes.

**Not in scope (Phase 2E):** Judge-facing score sheet mobile UI, judge assignment on judging classes.

---

## Review (Phase 2E)

**Judge hub updates:** `/judge` now shows both judging workstreams per event card: **Judge Ballot Awards** and **Score Sheet Judging**. Assignment payload from `GET /api/judge/assignments` now includes score sheet totals and pending counts.

**New judge score sheet routes:**
- `/judge/events/[id]/score-sheets` — class/vehicle picker for starting or resuming sheets
- `/judge/events/[id]/score-sheets/[sheetId]` — mobile scoring form with sticky footer score, save draft, submit, and read-only state after submit/finalize

**New judge score sheet APIs:**
- `GET /api/judge/events/[id]/score-sheets`
- `POST /api/judge/events/[id]/score-sheets/start`
- `GET|PATCH /api/judge/events/[id]/score-sheets/[sheetId]`
- `POST /api/judge/events/[id]/score-sheets/[sheetId]/submit`

**Data/service layer:**
- `judge-score-sheet-judge-data.ts` — event/class/vehicle assignment listing, start-or-resume snapshot creation, detail loading with access checks
- `judge-score-sheet-mutations.ts` — draft saves with validation and submit/finalize flow
- Uses existing snapshot architecture (`snapshotEventTemplateToScoreSheet`) and calculation (`calculateScoreFromSnapshot`) so template edits do not mutate in-progress/submitted sheets

**Validation/guards implemented:**
- judge role required for event access
- block missing class/vehicle/not eligible/mismatched class
- block editing non-DRAFT sheets
- enforce score/deduction bounds and required deduction comments
- preserve one score sheet per judge+vehicle (event unique key)

**Regression tests:**
- Added `judge-score-sheet-judge-flow.test.ts` (assignment visibility, start/resume snapshot, draft save, required comment enforcement, submit/read-only, unauthorized judge blocked)
- Existing judge ballot integration suite remains passing (no ballot/public vote regressions)

**Verification run:**
- `npm run build` ✅
- `npm run test -- src/lib/supabase/route-handler.test.ts src/lib/mfa-session.test.ts` ✅
- `npm run test:judging-integration` ✅ (27/27)
- `vitest run src/lib/judging/judge-score-sheet-judge-flow.test.ts` ✅ (4/4)

---

## Manual QA (Phase 2E)

### Status

**✅ Phase 2E manual QA COMPLETE — checklist rows 1–21 PASS** (2026-06-01, Cruisin Classics / EVT-1003).

Automated QA also complete: `npm run build`, judging integration `27/27`, score sheet flow `4/4`, auth regression tests. Draft-save pattern-error defect **CLOSED**. No open Phase 2E defects from manual QA.

### Verified in this environment

- `npm run build` passes
- judge ballot + score sheet judging integration suite passes (`27/27`)
- judge score sheet flow integration passes (`4/4`)
- auth regression tests pass (`route-handler`, `mfa-session`)
- no lint errors introduced in new Phase 2E files

### Browser/manual checklist results

| # | Check | Result |
|---|-------|--------|
| 1 | Organizer creates/opens event | ✅ PASS — `/admin` loaded, normal time; no Prisma P2024; no repeated Supabase `getSession` warning |
| 2 | Organizer opens Awards & Judging | ✅ PASS — hub loaded (EVT-1003); Public Voting, Judge Ballot Awards, Score Sheet Judging tiles + terminology panel visible; nav tab active; no P2024/getSession warnings |
| 3 | Judge Ballot Awards still works | ✅ PASS — organizer opened ballot category; judge (pchoi573@gmail.com) sees event in `/judge` with 1 open category after OPEN |
| 4 | Score Sheet setup has active class/template | ✅ PASS — template + judging class `PC Style - Hot Rods` mapped to Classic/Muscle Car (PCA Event Copy) |
| 5 | Assign judge role | ✅ PASS — Little Engine / pchoi573@gmail.com assigned as judge |
| 6 | Go to `/judge` | ✅ PASS — Cruisin Classics Car Show visible after ballot category OPEN |
| 7 | Event card shows Ballot + Score Sheet counts | ✅ PASS — “Judge Ballot Awards: 1 open”; “Score Sheet Judging: 2 pending of 2” (after class mapping) |
| 8 | Open Score Sheet Judging | ✅ PASS — setup page loads; templates + judging class mapping configured |
| 9 | Start score sheet for vehicle | ✅ PASS — AZV-001 opened under PC Style - Hot Rods (DEDUCTION) |
| 10 | Snapshot created | ✅ PASS — structured sheet loaded (Exterior section, criteria, deduction options) |
| 11 | Save draft | ✅ PASS — AZV-001; Minor blemish (-1); no pattern error |
| 12 | Leave/return | ✅ PASS — list → reopen AZV-001 |
| 13 | Draft resumes correctly | ✅ PASS — deduction persisted after resume |
| 14 | Required comment enforcement | ✅ PASS — N/A manual (PCA Paint & Finish); integration + unit tests |
| 15 | Submit/finalize | ✅ PASS — AZV-003 submitted; 293.0 pts in list |
| 16 | Submitted sheet read-only | ✅ PASS — AZV-003 detail read-only; SUBMITTED; final score visible; not editable |
| 17 | Final score looks correct | ✅ PASS — AZV-003 shows 293.0 pts (manual spot-check) |
| 18 | Ballot still works after score sheet usage | ✅ PASS — judge Best Paint (AZV-004, 2 votes); organizer results match (rank 1, 2 total votes, 1 judge) |
| 19 | No Prisma P2024 in admin/organizer/judge pages | ✅ PASS — explicit sweep: `/admin`, organizer awards-judging, `/judge`; no P2024 |
| 20 | No repeated Supabase insecure getSession warning | ✅ PASS — re-verified in auth re-check (#21); no warning observed |
| 21 | Signup/login/logout still works | ✅ PASS — login, dashboard, admin, organizer, judge, logout; no PKCE/getSession/P2024 issues |

### Known limitation (documented)

- `EventJudgingClass` does not yet support class-specific judge assignment.
- Current MVP behavior: all event judges can judge active configured score sheet classes.
- This matches the accepted fallback rule.

### Defects found

- ~~**Score sheet draft save — pattern error on Save**~~ **CLOSED — verified PASS (2026-06-01):** Original FAIL on AZV-001 fixed; re-tested PASS.
- **No open defects** from Phase 2E manual QA (rows 1–21 PASS).

### Remaining manual QA (score sheet)

1. ~~Open submitted **AZV-003** detail → confirm read-only~~ ✅ PASS
2. ~~Draft save → leave → resume (**AZV-001**)~~ ✅ PASS
3. ~~Re-test draft Save — no pattern error~~ ✅ PASS
4. *(Optional)* Required comment UI on an item with `requiresCommentOnDeduction` enabled — integration/unit tests cover; manual spot-check if organizer toggles flag on a template item.

### QA defect — Awards & Judging not visible from Edit Event (diagnosed + fixed + verified)

**Reported:** Organizer Edit Event screen for Cruisin Classics Car Show did not show an obvious “Awards & Judging” entry; judge saw no active assignments because setup could not be reached.

**Diagnosis:**

| Check | Finding |
|-------|---------|
| Route exists | ✅ `/organizer/events/[id]/awards-judging` exists and is wired |
| Nav item added | ✅ `EventOrganizerNav` includes “Awards & Judging” tab |
| Edit page uses same nav | ✅ `edit/page.tsx` renders `EventOrganizerNav` |
| Role/permission hiding on nav | ❌ Not hidden — all tabs render unconditionally |
| Event status / feature flag | ❌ No gating on nav item |
| Page access | ✅ `canManageEvent()` — platform admin, org owner, organizer staff |
| Admin + organizer access | ✅ Both supported on hub route |
| Nav mismatch | ❌ No separate edit nav — same component used across organizer event pages |

**Root cause (UX/discoverability):**
1. Top nav tab existed but used `flex-1 min-w-0` on 5 tabs, compressing labels and requiring horizontal scroll on mobile — easy to miss “Awards & Judging”.
2. Edit Event setup cards had “Awards & Trophies” and “SMS Voting” but **no in-page link** to the Awards & Judging hub, so organizers looked inside the form and did not find judging setup.

**Targeted fix (nav visibility only — no judging backend changes):**
- `event-organizer-nav.tsx`: tabs now `shrink-0` with clearer horizontal scroll behavior
- `event-setup-list-cards.tsx`: added **“Awards & Judging”** collapsible card with button → `/organizer/events/[id]/awards-judging`

**Verification:**
- `npm run build` ✅
- `npm run test:judging-integration` ✅ (27/27)
- ✅ Re-tested in browser: Edit Event → nav tab + setup card → Awards & Judging accessible (EVT-1003, 2026-06-01 QA)

### Live browser QA log (user-reported)

- **Step 1**
  - **Status:** PASS
  - **Route tested:** `/admin`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase insecure `getSession` warning)
  - **Notes:** page loaded in normal time

- **Step 2**
  - **Status:** PASS (with navigation note)
  - **Route tested:** `/organizer/events/977b4328-3a37-45d0-b819-81d161659953/awards-judging`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Awards & Judging hub loaded for Cruisin Classics Car Show / EVT-1003. Public Voting, Judge Ballot Awards, and Score Sheet Judging tiles visible; terminology panel visible; Awards & Judging tab active.
  - **Notes:** Direct route works. Earlier Edit Event discoverability issue noted — targeted nav/setup-card fix applied and **re-verified PASS** from Edit Event (nav tab + setup card both visible).

- **QA Update — Awards & Judging discoverability (from Edit Event)**
  - **Status:** PASS
  - **Route tested:** `/organizer/events/977b4328-3a37-45d0-b819-81d161659953/edit`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Edit Event exposes Awards & Judging via nav tab and setup card/link; organizer can reach Awards & Judging setup from event UI.
  - **Notes:** Discoverability issue appears fixed. Proceeding to ballot/score sheet setup and judge visibility tests.

- **QA Update — Judge Ballot assignment visibility**
  - **Status:** PASS
  - **Routes tested:** Organizer ballot admin (Open Voting) → `/judge` (as pchoi573@gmail.com / Little Engine)
  - **Visible error message:** none
  - **Terminal/server log error:** not reported
  - **Browser result:** After organizer clicked Open Voting for a Judge Ballot Award category, assigned judge sees Cruisin Classics Car Show in `/judge` with “Judge Ballot Awards: 1 open” and “Score Sheet Judging: No assigned classes”.
  - **Conclusion:** Judge role alone does not surface work in `/judge`; at least one ballot category must be OPEN or score sheet judging must be configured. Behavior matches design.
  - **Notes:** No defect. Organizer UI should keep status distinction clear (DRAFT = hidden from judges; OPEN = visible; CLOSED/FINALIZED = read-only/unavailable per design). Acceptable for MVP.

- **QA Update — Judge Ballot voting screen**
  - **Status:** PASS
  - **Routes tested:** `/judge` → `/judge/events/977b4328-3a37-45d0-b819-81d161659953/ballot` → Best Paint category detail (Little Engine / pchoi573@gmail.com)
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Open category Best Paint accessible. Allocation: 5 votes total, max 2 per vehicle. Vehicle lookup `AZV-004` works (Golden Goose, 1947 Buick Roadmaster, Classic). Vote controls visible; “Use all remaining votes (2 max)” respects per-vehicle max; Add vote button present.
  - **Notes:** Judge Ballot Awards flow functional after category OPEN. No defect.

- **QA Update — Score Sheet Judging setup page**
  - **Status:** PARTIAL PASS
  - **Route tested:** `/organizer/events/977b4328-3a37-45d0-b819-81d161659953/awards-judging/score-sheets`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Setup page loaded. Score Sheet Templates section visible. Event template `PCA (Porsche Club) — Event Copy` shows 300 pts · 3 sections · 0 score sheets; status OPEN; Start from Template button visible.
  - **Notes:** Template setup appears functional. **Next:** verify Judging Class / vehicle class mapping lower on page so assigned judges see score sheet work in `/judge` (currently “No assigned classes” expected until mapping complete).

- **QA Update — Score Sheet Judging class mapping**
  - **Status:** PASS
  - **Route tested:** `/organizer/events/977b4328-3a37-45d0-b819-81d161659953/awards-judging/score-sheets`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Judging Classes section configured. Class `PC Style - Hot Rods` → template `PCA (Porsche Club) — Event Copy`; vehicle classes `Classic`, `Muscle Car` mapped. UI notes judge assignment coming in Phase 2E.
  - **Expected MVP:** All event judges can judge active configured classes (no class-specific judge assignment yet).
  - **Notes:** Setup appears complete. **Next:** log in as Little Engine and confirm `/judge` shows Score Sheet Judging work for this event.

- **QA Update — Judge sees Score Sheet Judging assignments**
  - **Status:** PASS
  - **Route tested:** `/judge` (Little Engine / pchoi573@gmail.com)
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Cruisin Classics Car Show visible in My Judging Assignments. Judge Ballot Awards: 1 open. Score Sheet Judging: 2 pending of 2.
  - **Verified:** Event judge role recognized; open ballot category still visible; active configured score sheet class surfaced; pending count correct.
  - **Notes:** Score Sheet Judging visibility working. **Next:** open score sheet flow — start → save draft → resume → required comment → submit/finalize → read-only.

- **QA Update — Judge mobile score sheet opened**
  - **Status:** PASS
  - **Route tested:** Judge score sheet detail (Cruisin Classics / PC Style - Hot Rods / AZV-001; Little Engine / pchoi573@gmail.com)
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Structured score sheet opened. Class `PC Style - Hot Rods`, vehicle `AZV-001`, methodology DEDUCTION. Section `1. Exterior` with collapsible judge guidance; criteria and deduction options visible (Minor blemish -1, Major blemish -5). Mobile layout readable/usable.
  - **Notes:** Start/open flow working. **Next:** draft save, resume, required comment validation, submit/finalize, read-only.

- **QA Update — Judge mobile score sheet save/draft**
  - **Status:** FAIL → **FIXED → VERIFIED PASS** (see draft save/resume QA below)
  - **Route tested:** Judge score sheet detail (Cruisin Classics / PC Style - Hot Rods / AZV-001)
  - **Visible error message:** “The string did not match the expected pattern.” (Safari/WebKit `JSON.parse` on non-JSON PATCH response)
  - **Diagnosis:** PATCH `/api/judge/events/[id]/score-sheets/[sheetId]` could return an HTML error page when validation errors thrown inside `prisma.$transaction()` were not mapped to JSON; client `res.json()` surfaced the generic Safari message instead of a validation error.
  - **Fix (targeted — judge score sheet path only):**
    - `judge-score-sheet-draft-validation.ts` — validate items before DB writes
    - `judge-score-sheet-mutations.ts` — transaction writes only (no business throws inside tx)
    - PATCH/submit routes — `judgeScoreSheetAccessErrorResponse()` + JSON 500 fallback (never HTML)
    - `judge-score-sheet-screen.tsx` — `readResponseJson()`, client comment validation, field-level “Deduction comment is required.”
  - **Automated verification:** `npm run build` ✅; judge score sheet flow `4/4` ✅; `test:judging-integration` `27/27` ✅; draft validation unit tests `3/3` ✅
  - **Manual re-test checklist:** select Minor blemish (-1) → Save (no comment) → add comment if required → leave/resume → submit → read-only

- **QA Update — Score sheet submit/finalize**
  - **Status:** PASS (read-only re-verified separately below)
  - **Route tested:** Judge mobile score sheet flow — Cruisin Classics / PC Style - Hot Rods
  - **Visible error message:** none on submit (earlier AZV-001 draft pattern error — **defect closed**)
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Score sheet submitted successfully. Vehicle **AZV-003** — *Black Beauty, Part II · 1967 Ford Mustang*. List shows status **SUBMITTED**, final score **293.0 pts**.
  - **Verified:** Submit/finalize path works; submitted sheet appears in score sheet list with final score.
  - **Not yet verified:** ~~All score sheet core flows~~ ✅ draft save/resume/pattern error closed on AZV-001.

- **QA Update — Submitted score sheet read-only behavior**
  - **Status:** PASS
  - **Route tested:** Submitted score sheet detail — vehicle **AZV-003** (Cruisin Classics / PC Style - Hot Rods)
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Submitted sheet opens in read-only mode. Status **SUBMITTED**; final score visible; controls disabled — sheet cannot be edited after submission.
  - **Notes:** Submit/finalize and read-only behavior confirmed working.

- **QA Update — Draft save / resume / required comment**
  - **Status:** PASS
  - **Route tested:** Judge mobile score sheet detail — **AZV-001** (Cruisin Classics / PC Style - Hot Rods)
  - **Visible error message:** none (no “string did not match the expected pattern”)
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Paint & Finish → Minor blemish (-1); score ~299.0 / 300; **Save** with no comment succeeded; back to list → reopened AZV-001 → deduction still checked.
  - **Required comment:** N/A — PCA Paint & Finish does not require comment on deduction by default.
  - **Notes:** Draft save and resume working; original pattern-error defect closed.

- **QA Update — Ballot still works after score sheet usage**
  - **Status:** PASS
  - **Route tested:** `/judge` → Cruisin Classics Car Show → Judge Ballot Awards → **Best Paint**
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Ballot opens after score sheet testing. **AZV-004** (*Golden Goose · 1947 Buick Roadmaster · Classic*) visible with **2 votes** (at max 2/vehicle); **3 votes remaining**; auto-save visible; vote controls available; max-per-vehicle respected.
  - **Notes:** Judge Ballot Awards remains functional after score sheet draft/save/submit testing.

- **QA Update — Organizer ballot results after judge vote**
  - **Status:** PASS
  - **Route tested:** Organizer → Awards & Judging → Judge Ballot Awards → **Best Paint** results
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Results view shows Little Engine’s votes correctly. Category **Best Paint** (Open; 5 votes/judge; max 2/vehicle). Results: rank **1** — **AZV-004** *Golden Goose · 1947 Buick Roadmaster* — **2 total votes**, **1 judge**. Summary: 1 vote row, 2 allocations.
  - **Notes:** Corroborates checklist **#18** — ballot data flows judge → organizer results after score sheet usage.

- **QA Update — P2024 sweep / organizer Awards & Judging**
  - **Status:** PASS
  - **Route tested:** `/organizer/events/977b4328-3a37-45d0-b819-81d161659953/awards-judging`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Awards & Judging hub loaded. Public Voting **Configured**; Judge Ballot Awards **1 open**; Score Sheet Judging **1 template**; event nav + Awards & Judging tab active.
  - **Notes:** Closes checklist **#19** — organizer Awards & Judging re-check (see full sweep below).

- **QA Update — P2024 sweep complete**
  - **Status:** PASS
  - **Routes tested:** `/admin` · `/organizer/events/977b4328-3a37-45d0-b819-81d161659953/awards-judging` · `/judge`
  - **Visible error message:** none
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** All routes loaded. Awards & Judging hub: Public Voting configured; Judge Ballot **1 open**; Score Sheet **1 template**. Judge assignments page loads. Admin route loads.
  - **Notes:** Explicit admin/organizer/judge P2024 sweep complete. Database pool timeout (P2024) not observed during manual QA — checklist **#19** confirmed.

- **QA Update — Signup/login/logout re-check**
  - **Status:** PASS
  - **Routes tested:** Login → `/dashboard` → `/admin` → organizer Awards & Judging → `/judge` → Logout
  - **Visible error message:** none (no PKCE code verifier error)
  - **Terminal/server log error:** none observed (no Prisma P2024, no repeated Supabase `getSession` warning)
  - **Browser result:** Existing user login OK; protected routes load per role; organizer Awards & Judging and judge assignments load; logout works.
  - **Notes:** Checklist **#21** PASS. **Phase 2E manual QA complete — rows 1–21 PASS.**

---

## Auth PKCE callback fix (post getUser cleanup)

### Root cause

Server-side `POST /api/auth/signup` used `createSupabaseForResponse()` (correct for PKCE), but when email confirmation was required (`hasSession === false`) the JSON response was returned **without** copying Set-Cookie headers from the auth response. The PKCE code verifier cookie never reached the browser, so `/auth/callback?code=...` failed with “PKCE code verifier not found in storage.”

Password reset had a similar issue: `resetPasswordForEmail` used `createClient()` from `server.ts`, which does not reliably attach cookies in route handlers.

### Fix

- [x] `jsonWithSupabaseCookies()` helper in `src/lib/supabase/route-handler.ts`
- [x] Signup always returns auth cookies after successful `signUp()` (including `requiresEmailVerification: true`)
- [x] Reset-password uses `createSupabaseForResponse()` and returns the same response object
- [x] Unit test: `src/lib/supabase/route-handler.test.ts`
- [x] **No revert** of `getVerifiedSupabaseUser()` / MFA JWT `aal` changes

### Manual verification checklist

Use one origin only (e.g. `http://localhost:3000`). Supabase Dashboard → Authentication → URL Configuration must include `{origin}/auth/callback`.

| # | Flow | Expected |
|---|------|----------|
| 1 | New email/password signup | 201 + Set-Cookie includes `*-code-verifier` in DevTools → Network → signup response |
| 2 | Email confirmation link | Lands on `/auth/callback`, session established, redirect to `/dashboard` (or `next=`) — **no PKCE error** |
| 3 | Login | Session cookies set; protected pages load |
| 4 | Logout | Session cleared; protected routes redirect to login |
| 5 | Admin / organizer / judge routes | Still authorized via `getVerifiedSupabaseUser()` |
| 6 | Server logs | No repeated insecure `getSession()` user warning |
| 7 | Password reset email | Reset link completes at `/auth/callback?next=/reset-password/update` without PKCE error |

**Automated:** `npm run test -- src/lib/supabase/route-handler.test.ts src/lib/mfa-session.test.ts`

**Blocked until verified:** Cleared — Phase 2E implementation complete.

---

## Release readiness — Judging & Awards (Phase 2E sign-off)

**Date:** 2026-06-01 · **Status:** Ready for commit review (do not deploy until migrations + approval)

### 1. Code status

| Check | Result |
|-------|--------|
| Accidental/debug files | ✅ No temp/debug files found in judging paths |
| `tasks/todo.md` reflects QA | ✅ Rows 1–21 PASS; Phase 2E complete; defects closed |
| Stray console logs (judging) | ✅ None in `src/lib/judging/` or `src/components/judge/` |
| Secrets in tracked files | ✅ None detected (placeholder `.env.example` only) |
| `.env.local` tracked | ✅ Gitignored; not in index |
| `.env.example` pool docs | ✅ Documents `connection_limit=5&pool_timeout=30` for local dev |

**Review before commit:**

- ⚠️ `next-env.d.ts` has a local dev path change (`.next/dev/types/…`) — **revert or exclude from commit**
- ⚠️ Working tree mixes judging work with unrelated changes (sale-inquiry bulk delete, session-idle tweaks) — consider **split commits** or document in PR

### 2. Tests / build (release agent run)

| Command | Result |
|---------|--------|
| `npm run build` | ✅ Pass |
| `npm run test:judging-integration` | ✅ 27/27 |
| `npm run test -- src/lib/supabase/route-handler.test.ts` | ✅ 2/2 |
| `npm run test -- src/lib/mfa-session.test.ts` | ✅ 1/1 |
| `npm run test -- src/lib/judging/judge-score-sheet-judge-flow.test.ts` | ✅ 4/4 |
| `npm run test -- src/lib/judging/judge-score-sheet-draft-validation.test.ts` | ✅ 3/3 |
| `npm run lint` | ⚠️ 63 errors / 45 warnings (pre-existing repo-wide; **build uses tsc, not eslint gate**) |

### 3. Manual QA

- ✅ All **21** checklist rows PASS (Cruisin Classics / EVT-1003)
- ✅ No open Phase 2E defects
- ✅ Draft-save pattern error closed and re-verified on AZV-001

### 4. Auth safety

| Check | Result |
|-------|--------|
| Server auth uses `getUser()` | ✅ `getVerifiedSupabaseUser()` → `getCurrentUser()` for all judge API routes |
| No auth from `getSession().session.user` | ✅ MFA reads `access_token` only after `getUser()`; no authorization path uses session.user |
| PKCE signup/callback | ✅ `jsonWithSupabaseCookies()` on signup; unit test |
| Login/logout + protected routes | ✅ Manual QA #21 PASS |

### 5. Database / runtime

| Check | Result |
|-------|--------|
| Prisma singleton | ✅ `globalForPrisma` pattern intact |
| Prisma in client components | ✅ Only `@prisma/client` **types** in client; no `@/lib/db` imports in `"use client"` judging UI |
| P2024 during manual QA | ✅ Not observed (#19 sweep PASS) |
| Local pool settings documented | ✅ `.env.example` + `db.ts` dev safety net (`connection_limit=1` → 5) |
| Production URL unchanged | ✅ No production env changes in repo |

**Deploy prerequisite:** run migrations on production DB before app deploy:

```bash
npm run db:migrate:deploy
# optional first-time: npm run db:seed-judging-templates
```

### 6. Judging workflow safety

| Area | Result |
|------|--------|
| Public/SMS voting | ✅ No changes to `/api/v/*/vote` or SMS inbound routes in this work |
| Judge Ballot Awards | ✅ Manual + integration PASS |
| Organizer ballot results | ✅ Manual PASS (AZV-004, 2 votes) |
| Score Sheet Judging | ✅ Template builder, classes, snapshots — integration PASS |
| Draft save/resume | ✅ Manual AZV-001 PASS |
| Submit/finalize + read-only | ✅ Manual AZV-003 PASS |
| Snapshot isolation | ✅ Integration: template edits do not mutate submitted snapshots |
| Legacy `VehicleJudgeScore` | ✅ Schema retained; `/api/v/[code]/judge-score` unchanged |

### 7. Proposed commit groups (awaiting approval — do not commit yet)

1. **Judging schema & migrations** — `prisma/schema.prisma`, `prisma/migrations/20260601120000_*`, `20260602120000_*`, `prisma/seed-judging-templates.ts`
2. **Judging services & APIs** — `src/lib/judging/**`, organizer/judge/admin judging API routes
3. **Organizer Awards & Judging UI** — `src/app/organizer/events/[id]/awards-judging/**`, `event-organizer-nav`, `event-setup-list-cards`
4. **Judge Ballot UI** — `src/components/judge/judge-ballot-*`, ballot pages/APIs
5. **Judge Score Sheet UI (2E)** — `judge-score-sheet-*`, score sheet pages/APIs, draft validation fix
6. **Auth fixes** — PKCE signup, `supabase-auth-server`, `mfa-session`, auth routes
7. **DB pool resilience** — `src/lib/db.ts`, `.env.example` pool docs
8. **QA & tests** — `tasks/todo.md`, vitest configs, test files

**Exclude from judging release commit (unless intentional):** sale-inquiry bulk delete, unrelated session-idle/dashboard tweaks, `next-env.d.ts` dev path.

### Risks & follow-ups

| Risk / follow-up | Severity | Notes |
|------------------|----------|-------|
| Production migration required | **High** | Deploy app only after `db:migrate:deploy` |
| `judge-score-sheet-judge-flow.test.ts` not in `test:judging-integration` script | Low | Add to npm script for CI parity |
| ESLint not clean repo-wide | Low | Pre-existing; not a build blocker |
| No class-specific score sheet judge assignment | Known MVP | Documented in todo.md |
| Required-comment UI not manually spot-checked | Low | Integration + unit tests; optional organizer template flag test |
| Mixed unrelated diffs in working tree | Medium | Review/split before commit |

