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
