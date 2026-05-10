# Tasks

## Auth UI refresh (login / signup) — completed

### Plan

- Introduce shared auth layout (centered shell + card styling tokens).
- Apply indigo primary accent globally via CSS variables (neutral base unchanged elsewhere).
- Login: branded header, alerts with icons, stronger CTA, focus/hover on links.
- Signup: section grouping (Profile / Security / Contact), same card/shell, dialogs and success state aligned.

### Todo

- [x] Add `auth-ui` tokens + `AuthPageShell`
- [x] Update `globals.css` primary / ring / sidebar-primary (light + dark)
- [x] Refactor `login-form.tsx`
- [x] Refactor `signup/page.tsx` + optional `UsPhoneInput` `className`

---

## Review

**Summary**

- **`src/lib/auth-ui.ts`** — Shared classes for auth cards, logo tile, inputs, primary button emphasis, and alert banners (success/error).
- **`src/components/auth/auth-page-shell.tsx`** — Centered viewport layout with a soft primary-tinted background glow.
- **`src/app/globals.css`** — Light/dark `--primary` set to an indigo accent; `--ring` and light `--sidebar-primary` aligned for a cohesive SaaS accent (no logic changes).
- **`src/app/(auth)/login/login-form.tsx`** — Uses shell + card polish; `role="alert"` / `role="status"` with icons; links use visible focus rings.
- **`src/app/(auth)/signup/page.tsx`** — Same shell/card; form split into sections; error banner matches login; dialogs use rounded-2xl + backdrop blur; success card uses emerald-accent icon treatment; primary actions use shared button styling.
- **`src/components/inputs/us-phone-input.tsx`** — Optional `className` forwarded to `Input` for styling only.

**Business logic:** Unchanged (same API payloads, redirects, validation messages, and client flow).

---

## Responsive layout + centered content — completed

- **`globals.css`** — Added `.page-shell` (`mx-auto w-full` + horizontal padding + vertical rhythm), `.page-head` (centered title block on small screens, left from `sm:` up), and `.layout-bar` (header/footer: `max-w-7xl` + `mx-auto` + padding).
- **Replaced `container mx-auto …`** across app pages with `page-shell` + explicit `max-w-*` so the main column is always full-width up to the cap and centered with predictable padding (Tailwind v4 `container` does not center by itself).
- **Header / footer** — Use `layout-bar`; footer stacks and centers on narrow viewports.
- **UX polish** — Page titles and toolbars use `page-head` / flex patterns so CTAs and back links center on mobile where it helps (events list cards, event detail hero, organizer/dashboard headers, forgot/reset cards with `mx-auto`).

---

## Event create/edit form + hosting org + public contact — completed

### Plan

- Restructure **Event contact** (first/last row, masked phone, email), **Event marketing** (flyer, logo, Instagram), **Event organizer** (hosting org dropdown + add-org link with `returnTo`).
- Load **organizations** from the user’s **organization memberships** on new/edit event pages.
- Public event **Contact** uses **displayContactName** (first/last vs legacy `contactName`); label **Instagram** for `socialHashtag`.
- **POST /api/events**: require **any org membership** (`requireOrgMember`) when `orgId` is set (not owner-only).

### Todo

- [x] `event-form.tsx` — sections + `UsPhoneInput` + hosting dropdown + `Add car club / organization` with `returnTo`
- [x] `organizer/events/new` + `organizer/events/[id]/edit` — pass `organizations`; edit loads `contactFirstName` / `contactLastName`
- [x] `(public)/events/[id]` — `displayContactName` + Instagram label
- [x] `new-organization-form.tsx` — `returnTo` query (safe internal paths only)
- [x] `api/events/route.ts` — fix org gate to `requireOrgMember` + message

### Review

**Summary**

- **`src/components/forms/event-form.tsx`** — Contact split fields; marketing labels; organizer section with `<select>` from props and link to `/organizer/organizations/new?returnTo=<current path>`; consolidated `Button` import.
- **`src/app/organizer/events/new/page.tsx`** — Queries `organizationMember` for the signed-in user and passes `organizations` to `EventForm`.
- **`src/app/organizer/events/[id]/edit/page.tsx`** — Same membership query; `initial` includes `contactFirstName` / `contactLastName`.
- **`src/app/(public)/events/[id]/page.tsx`** — Contact name via `displayContactName`; social line labeled “Instagram”.
- **`src/app/organizer/organizations/new/new-organization-form.tsx`** — After create, redirects to `returnTo` when present (unless `eventId` linking flow runs first); Cancel respects `returnTo`.
- **`src/app/api/events/route.ts`** — Uses `requireOrgMember` for `orgId` on create (matches “associated on profile” hosting).

**Follow-up:** Run `npm run db:generate` (and apply migrations) whenever Prisma schema changes so TypeScript stays aligned with `Event.contactFirstName` / `contactLastName`.

**Tests:** No test runner in `package.json`; logic covered by existing `displayContactName` / `splitLegacyContact` helpers in `src/lib/contact-display.ts`.

---

## Event Details: registration fee + multi-day hours — completed

### Summary

- **Schema:** `RegistrationFeeType` enum (`FREE`, `PAID`, `DONATION`), `registrationFeeDollars`, `dailyHours` JSON on `Event`. Migration `20260503180000_event_fee_daily_hours`.
- **First card title:** “Event Details”; **Registration fee** (`CurrencyDollarsInput`, `$` prefix, whole dollars) left; **Registration fee type** select right with placeholder “Select Registration Fee Type” (muted when empty).
- **Schedule:** Section renamed **Event date/time**; each row has **Event date**, **Start time**, **End time** on one row; **+** on the last row adds the next calendar day with copied times; extra rows can be removed with **−** (rows after the first).
- **API:** `dailyHours` drives derived `startDate`, `endDate`, `isMultiDay`, and first-row `startTime`/`endTime`; registration fee resolved on POST/PATCH.
- **Public event page:** Per-day lines when `dailyHours` exists; registration fee line when `registrationFeeType` is set.
- **Helpers:** `src/lib/daily-hours.ts`, `src/components/inputs/currency-dollars-input.tsx`.

---

## Event Details layout + listing status — completed

- **Event Details card:** Event listing status first (when editable), then Event name, Description, then one row with **Event type** | **Registration fee type** | **Registration fee** (`sm:grid-cols-3`). Venue geocoding note moved to **Venue & address**.
- **Listing status:** Label **Event listing status**; options **Draft**, **Scheduled**, **Published-LIVE** (maps to `DRAFT`, `SCHEDULED`, `PUBLISHED`). New Prisma value `SCHEDULED` + migration `20260503200000_event_status_scheduled`.
- **Public list / detail:** `SCHEDULED` and `PUBLISHED` appear on the public events list and detail pages; vehicle registration remains **`PUBLISHED` only**.
- **Org rule:** Scheduling or publishing requires a linked organization (same as before for publish).
- **Actions:** **Cancel** and **Save changes** duplicated at **top and bottom** of the form (`FormActions`).

---

## Listing scheduled datetime + contact row — completed

- **`listingScheduledAt`** on `Event` (migration `20260503210000_event_listing_scheduled_at`).
- **Event contact:** Phone and email on one row (`sm:grid-cols-2`).
- **Listing scheduled date/time** beside **Event listing status**; Draft = empty + disabled/greyed; Scheduled = editable `datetime-local`; Published-LIVE = disabled, save stamps **now** (server + client).
- **Validation:** Scheduled save with blank or past datetime → modal: *Scheduled Listing must have a Date and Time in the future* (client + Zod + API message match).
- **Auto status:** When listing status is Scheduled and the datetime goes from empty/past to **future**, status flips to **Published-LIVE** and listing time resets to **now** (per spec).
- **Status select colors:** Draft pink, Scheduled yellow, Published-LIVE green borders/backgrounds.

---

## Event form: fee order, quarter-hour time UI, save confirmation — completed

### Plan

- Registration fee type `<option>` order: **Paid**, **Donation**, **Free** (after placeholder).
- Replace native `<input type="time">` start/end with **hour + minute** selects (minutes **00 / 15 / 30 / 45** only); keep storing `HH:MM` in `dailyHours`.
- After successful edit save: **full navigation** to `/organizer/events/[id]/edit?saved=1` and show a dismissible success banner from server `searchParams`.

### Todo

- [x] `time-quarter-hour.ts` — `QUARTER_MINUTE_OPTIONS`, `parseQuarterHourParts`
- [x] `quarter-hour-time-pickers.tsx` — hour + minute selects
- [x] `event-form.tsx` — fee order, schedule UI, `savedConfirmation`, `window.location.assign` on PATCH success
- [x] `organizer/events/[id]/edit/page.tsx` — `searchParams`, pass `savedConfirmation`

### Review

**Summary**

- **`src/lib/time-quarter-hour.ts`** — Exported `QUARTER_MINUTE_OPTIONS` and `parseQuarterHourParts()` for UI binding after `normalizeTimeToQuarterHour`.
- **`src/components/inputs/quarter-hour-time-pickers.tsx`** — Client component: hour `00`–`23` + minute dropdown restricted to quarter hours; empty hour clears stored time; minute disabled until hour chosen (default minute **00** when hour is set).
- **`src/components/forms/event-form.tsx`** — Fee options reordered; schedule rows use `QuarterHourTimePickers` instead of native time inputs; successful PATCH navigates to `.../edit?saved=1`; green banner when `savedConfirmation` with **Dismiss** link stripping the query.
- **`src/app/organizer/events/[id]/edit/page.tsx`** — Reads `searchParams.saved === "1"` and passes `savedConfirmation` to `EventForm`.

**Why navigation:** Replaces `router.refresh()` so the page reloads server-rendered data and shows a clear saved state (fixes perceived “Save changes” not persisting).

---

## Quarter-hour clock modal (start/end time) — completed

- **`src/lib/time-12h.ts`** — 12-hour display helpers (`from24Hour`, `to24Hour`, `formatHhMmAs12hLabel`) for the picker header.
- **`src/components/inputs/quarter-hour-clock-modal.tsx`** — Base UI `Dialog`: digital header (tap hour vs minute + AM/PM), analog face for hours 1–12, minute ring in **5-minute** steps, **Clear** / **Cancel** / **OK**. Still persists 24-hour `HH:MM`.
- **`src/components/inputs/quarter-hour-time-pickers.tsx`** — Read-only 12-hour label + **clock icon** opens the modal; remount key resets draft when reopening.

**Later tweaks:** Wider **event date** column; time row is **text input** (`12:00 PM` placeholder) + clock; **`parseTypedTimeToHhMm`** in `time-12h.ts`; **`estimatedCarCount`** on Event + form grid with event name.

---

## Dashboard: five destinations — completed

### Plan

- Landing **`/dashboard`** shows exactly five cards: My Events, My Vehicles, My Awards, My Clubs, My Profile (Lucide icons + short copy + Open links).
- Fix **`Button asChild`** usage on dashboard subpages (project `Button` has no `asChild`; use `Link` + `buttonVariants`).
- Event status label: replace all underscores in enum display.

### Todo

- [x] Rewrite `src/app/dashboard/page.tsx` with five sections
- [x] Fix `events/page.tsx` and `clubs/page.tsx` link styling (remove invalid `asChild`)
- [x] `events/page.tsx` — `ev.status.replace(/_/g, " ")`

### Review

**Summary**

- **`src/app/dashboard/page.tsx`** — Welcome line + responsive grid of five cards linking to `/dashboard/events`, `/dashboard/vehicles`, `/dashboard/awards`, `/dashboard/clubs`, `/dashboard/profile` (Calendar, Car, Trophy, Users, UserCircle icons).
- **`src/app/dashboard/events/page.tsx`** — All former `Button asChild` patterns replaced with `Link` + `buttonVariants`; organizer/exhibitor flows unchanged; multi-word status labels fixed.
- **`src/app/dashboard/clubs/page.tsx`** — “Create organization” uses `Link` + `buttonVariants({ variant: "secondary" })`.

**Verification:** `npx tsc --noEmit` and `npm run lint` pass.

---

## Dashboard Events: managing vs participating tabs — completed

### Plan

- Rename top-level heading to **Events** with copy that contrasts running vs entering.
- URL-driven tabs (`?tab=participating`, `?page=`) — server-rendered, shareable, no client JS for tab state.
- **Managing:** all `EventStaff` roles per event (merged + sorted badges); paginate after grouping by event.
- **Participating:** exhibitor `Registration` rows with Exhibitor + registration status badges; DB pagination `skip/take`.
- Lightweight counts on tabs; footer shortcuts (create event, organizer, registrations, browse).
- SaaS-style card list + subtle tab chrome; **Edit event** only when user has Organizer staff role.

### Todo

- [x] `event-role-labels.ts` + Vitest tests for `sortRolesForDisplay`
- [x] `badge.tsx`, `dashboard-events-url.ts`, split dashboard event UI components
- [x] Refactor `dashboard/events/page.tsx` + update dashboard tile copy

### Review

**Summary**

- **`src/app/dashboard/events/page.tsx`** — Parses `tab` / `page`, clamps page to total pages, loads only the active tab’s rows (cheap `groupBy` count for managing + registration count for participating).
- **`src/lib/dashboard-events-url.ts`** — `hrefDashboardEvents`, `parseEventsTab`, `parseEventsPage`, page size 18.
- **`src/components/dashboard/events/events-overview.tsx`** — Tab strip with counts, explanatory copy, pagination wiring.
- **`src/components/dashboard/events/event-rows.tsx`** — Role badges (staff), Exhibitor + registration status badges, actions (Edit event if Organizer, public event link).
- **`src/components/dashboard/events/events-pagination.tsx`** — Previous / Next + range label.
- **`src/components/ui/badge.tsx`** — CVA variants for role/status chips.
- **`vitest` + `src/lib/event-role-labels.test.ts`** — `npm run test`.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## New Car Club screen + Organization schema — completed

### Plan

- Route **`/dashboard/clubs/new`** (auth required) with full car-club form; **My clubs** “Add New Car Club” links here.
- Extend **`Organization`** in Prisma with meeting address, contact, URLs, about flags, year founded, last activity date (included in consolidated baseline migration).
- **`POST /api/organizations`** uses **`createCarClubSchema`** (`src/lib/validation/organization.ts`); legacy minimal `{ name, description }` still works.
- Split form UI into **`car-club-details-meeting.tsx`** and **`car-club-contact-online-about.tsx`** (keep files under ~300 lines).

### Todo

- [x] Prisma + migration SQL
- [x] Validation + API
- [x] Dashboard form pages + clubs link
- [x] `npm run db:migrate` / `db:push` locally after pull

### Review

**Apply migration:** From `car-show-app`, run `npm run db:migrate` (or `db:push` in dev) so new columns exist.

**Removed:** `createOrganizationSchema` from `validation/event.ts` — use `createCarClubSchema` from `validation/organization.ts`.

---

## Prisma: baseline migration (fix P3006 shadow DB) — completed

**Cause:** Older migrations only contained `ALTER TABLE "events"` steps; an empty shadow database had no `events` table, so `prisma migrate dev` failed with P3006 / P1014.

**Change:** Replaced incremental migration folders with a single **`20260503000000_init_schema`** migration generated via  
`prisma migrate diff --from-empty --to-schema-datamodel` (matches current `schema.prisma`).

**If your Supabase DB already matches this schema** (e.g. you used `db push`): mark the migration applied without running SQL:  
`npx prisma migrate resolve --applied 20260503000000_init_schema`

**If the DB is empty:** run `npm run db:migrate` as usual.

**If Prisma reports drift or checksum errors** from old `_prisma_migrations` rows, resolve with Prisma’s baseline docs or reset the migration history table only after backing up (advanced).

---

## New Car Club — meeting location search (Places vs Geocode) — completed

- **UI:** City & state required; **either** venue **Place** or **Street address**; divider “or street address”; row **Primary meeting location (label)** + primary **Search** button (magnifying glass); ZIP / lat / lng filled from results.
- **API:** `POST /api/maps/resolve-car-club-meeting` — if `street` is non-empty → **Geocoding only**; else **Places Text Search + Details** for `place` + city + state.
- **Libs:** `resolve-car-club-meeting.ts`; exported `resolveViaPlacesTextSearch` / `resolveViaGeocodeOnly` wrappers in `resolve-event-location.ts`.

---

## New Car Club — section order (details → contact → meeting) — completed

### Plan

- Render **Club details** first.
- Render **Club contact** (+ club info + about cards) second.
- **Primary meeting location** sits after **Club info**, before **About** (see latest review below).

### Todo

- [x] Remove meeting card from `car-club-details-meeting.tsx`
- [x] Compose order in `car-club-form-fields.tsx` / contact section

### Review

**Summary**

- **`car-club-details-meeting.tsx`** — Only the **Club details** card; year column uses `0.75fr` vs club name `2.25fr` to match **Role** width.
- **`car-club-contact-online-about.tsx`** — **Club contact** → **Club info** → **Primary meeting location** → **About**.
- **`car-club-form-fields.tsx`** — `CarClubDetailsMeetingSection` then `CarClubContactOnlineAboutSection` only.
- **`car-club-meeting-frequency-time.tsx`** — Frequency `3fr`, meeting time `1fr` on `sm` (aligned with email/phone and role-like narrow column).
- **`car-club-meeting-location-card.tsx`** — **See address details** sits directly under the primary meeting location row; expanded fields stay below the toggle; **Meeting frequency / time** follow. Chevron sits beside the label (not screen-edge).
- **`car-club-info-card.tsx`** — **Other social media sites** uses the same inline chevron pattern.

**Verification:** `npx tsc --noEmit` and `npm run lint` pass.

---

## New Car Club — upcoming activities (replace last event date) — completed

### Review

**Summary**

- **`car-club-about-card.tsx`** — **Primary activities — last event date** replaced with **`CarClubUpcomingActivities`** (links to `/events/[id]`).
- **`car-club-upcoming-activities.tsx`** — Loads **`GET /api/organizations/[orgId]/upcoming-events`** when `organizationId` is set; new-club flow shows guidance until the club exists.
- **`src/app/api/organizations/[orgId]/upcoming-events/route.ts`** — Member-only; events with future start or ongoing end; not CLOSED/ARCHIVED.
- Removed **`lastActivityDate`** from form, Zod schema, and POST body.
- **`src/lib/club-event-location-line.ts`** + **`club-event-location-line.test.ts`**.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## Organization `clubState` (club details row) — completed

### Review

**Summary**

- **Prisma:** `Organization.clubState` optional string; migration `20260503250000_organization_club_state`.
- **`car-club-details-meeting.tsx`** — Row **Club name · Club state · Year founded** (`sm` grid `1.5fr / 0.75fr / 0.75fr`); state is US postal dropdown.
- **`createCarClubSchema`** + **`POST /api/organizations`** persist `clubState`; separate from meeting address **`state`**.

**Apply migration:** `npm run db:migrate` (or `db:push` in dev).

**Verification:** `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`.

---

## Dashboard My clubs — owner edit, archive, delete — completed

### Review

**Summary**

- **Prisma:** `Organization.archivedAt`; migration `20260503260000_organization_archived_at`.
- **`PATCH /api/organizations/[orgId]`** — Same payload validation as create (`createCarClubSchema`); **`requireOrgOwner`**.
- **`DELETE /api/organizations/[orgId]`** — Permanent delete; owner only.
- **`POST /api/organizations/[orgId]/archive`** — Body `{ archived: boolean }`; sets or clears **`archivedAt`**.
- **`/dashboard/clubs/[orgId]/edit`** — Owner-only edit UI (**`EditCarClubForm`**); non-owners redirected.
- **`dashboard/clubs/page.tsx`** — **`Edit club`** for **`role === "owner"`**; **Archived** badge when **`archivedAt`** set.
- **`buildCarClubApiPayload`** + **`organizationToCarClubFormValues`** shared helpers; **`new-car-club-form`** uses payload helper.

**Apply migration:** `npm run db:migrate` (or `db:push`).

**Verification:** `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## Edit Car Club — Events / Activities section + prefill new event — completed

### Review

**Summary**

- **`car-club-events-activities-card.tsx`** — Card **Events / Activities** with **Add new event** → `/organizer/events/new?orgId=…` and embedded **`CarClubUpcomingActivities`**.
- **`edit-car-club-form.tsx`** — **`showUpcomingInAbout={false}`** on **`CarClubFormFields`**; Events card placed after the main form, before Club availability.
- **`CarClubUpcomingActivities`** — **`embedded`** prop drops duplicate headings when nested.
- **`EventForm`** — **`prefillHostingOrgId`** sets initial hosting org on create.
- **`organizer/events/new/page.tsx`** — Reads **`searchParams.orgId`** and passes **`prefillHostingOrgId`** when it matches a membership org.

**Verification:** `npx tsc --noEmit`, `npm run lint`.

---

## New event — back to dashboard + defer full Add Car Club + link org to event — completed

### Plan

- **New event page:** Back link targets **`/dashboard`** (“← Back to dashboard”).
- **Hosting org = Add Car Club / Organization:** On save, **do not** create a stub org via API; save the event **without** `orgId`, then redirect to **`/dashboard/clubs/new?linkEventId=…&returnTo=…`**.
- **After club POST succeeds:** **`PATCH /api/events/:linkEventId`** with **`{ orgId }`**, then success UI → **`returnTo`** (safe internal path only) or **`/organizer/events/:id/edit`**.
- Wire **`safeInternalPath`** in **`new-organization-form`** (replace duplicated helper).

### Todo

- [x] `organizer/events/new/page.tsx` — back link → dashboard
- [x] `event-form.tsx` — defer flow, redirect to clubs/new with query; remove stub name field; explanatory copy
- [x] `new-car-club-form.tsx` — `linkEventId` / `returnTo`, PATCH link, Suspense + fallback
- [x] `safe-internal-path.test.ts`
- [x] `new-organization-form.tsx` — import `safeInternalPath`

### Review

**Summary**

- **`src/app/organizer/events/new/page.tsx`** — Primary navigation back uses **`/dashboard`** with label **← Back to dashboard**.
- **`src/components/forms/event-form.tsx`** — Selecting **Add Car Club / Organization** sets **`deferAddCarClubFlow`** (event saved with **no** `orgId`). After a successful create/update and optional uploads, **`window.location.assign`** sends the user to **`/dashboard/clubs/new?linkEventId=<eventId>&returnTo=<encoded /organizer/events/{id}/edit>`** instead of **`/organizer?created=1`**. Inline “new organization name” field removed; short note explains the deferred full club form.
- **`src/app/dashboard/clubs/new/new-car-club-form.tsx`** — **`useSearchParams`** for **`linkEventId`** and **`returnTo`**; after **`POST /api/organizations`**, **`PATCH /api/events/:linkEventId`** with **`{ orgId }`** (same-origin cookies); errors surface if linking fails; OK on success modal navigates via **`safeInternalPath(returnTo)`** or default edit URL; **Cancel** returns to event edit when **`linkEventId`** is present. Wrapped in **`Suspense`** with a loading fallback.
- **`src/lib/safe-internal-path.ts`** — Shared **`safeInternalPath`** (already added earlier).
- **`src/lib/safe-internal-path.test.ts`** — Vitest coverage for allowed vs rejected paths.
- **`src/app/organizer/organizations/new/new-organization-form.tsx`** — Uses **`safeInternalPath`** instead of a local duplicate.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## Hosting organization dropdown — name + club state — completed

- **`OrgOption`** includes optional **`clubState`**; dropdown labels use **`formatOrgNameWithClubState`** (shared helper).
- **`organizer/events/new`** and **`organizer/events/[id]/edit`** load **`clubState`** from Prisma with memberships.

**Verification:** `npx tsc --noEmit`, `npm run lint`.

---

## My clubs — card title name + club state — completed

- **`src/lib/format-org-display-name.ts`** — **`formatOrgNameWithClubState(name, clubState)`**; **`event-form`** imports it (replaces inline formatter).
- **`dashboard/clubs/page.tsx`** — Loads **`clubState`**; card title uses the shared formatter.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## My clubs — Create New Event + prefill hosting org — completed

- **`dashboard/clubs/page.tsx`** — Per club (when not archived), **Create New Event** → **`/organizer/events/new?orgId=<id>`**.
- **`organizer/events/new`** already validates **`orgId`** against memberships and passes **`prefillHostingOrgId`**; hosting **`<select>`** options use **`formatOrgNameWithClubState`**, so the chosen host shows as **`PCA New Jersey (NJ)`** when **`clubState`** is set.

**Verification:** `npx tsc --noEmit`, `npm run lint`.

---

## Event form — flyer/logo storage, date picker, no past dates (create) — completed

- **Flyer & logo** — Already saved via **`POST /api/events/:id/upload`** to Supabase **`event-assets`**, with **`flyerUrl` / `logoUrl`** on **`Event`**; public **`/events/[id]`** shows them. **Fix:** when **`orgId`** is null, storage path no longer used a bad folder; uploads go to **`pending-org/<eventId>/...`**. **Event marketing** copy states files appear on the public event page.
- **Event date** — Replaced free-text mm/dd with **`<input type="date">`** (browser calendar). **New events:** **`min={todayLocalYmd()}`** plus submit check; **`createEventSchema`** adds a create-only Zod rule (UTC calendar) so past schedule rows are rejected on **POST**. **Edits** keep past dates available (no **`min`**, no create-only API rule on **PATCH**).
- **`src/lib/event-schedule-date.ts`** — **`todayLocalYmd`**, **`isYmdBeforeLocalToday`** + tests.

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## Dashboard Managing tab — date + start time on cards — completed

- **`dashboard/events/page.tsx`** — Staff/event query selects **`startTime`**; **`ManagingEventRow`** includes it.
- **`format-event-meta.ts`** — **`formatEventDateAndStartTime`** (locale weekday date + 12h start from stored **`HH:MM`**).
- **`ManagingCard`** — Card subtitle shows date + start time, then location and status.

**Verification:** `npx tsc --noEmit`, `npm run lint`.

---

## Edit event — bottom actions + archive + delete — completed

- **`event-form.tsx`** — Bottom bar (edit only): **Cancel** + **Save changes** on the left; **Archive event** + **Permanently delete** on the right (under **`border-t`**). Confirm dialogs; **`PATCH`** archive / **`DELETE`** event. Top row remains Cancel + Save.
- **`PATCH /api/events/[id]`** — **`{ status: "ARCHIVED" }`** early-updates archive status.
- **`DELETE /api/events/[id]`** — Organizer-capable users only; **`prisma.event.delete`** (cascades).
- **`validation/event.ts`** — **`ARCHIVED`** allowed on schema; **`createEventSchema`** rejects creating archived events.

**Verification:** `npx tsc --noEmit`, `npm run lint`.

---

## Deprecate `/organizer` home → Dashboard Events (Managing) — completed

- **`/organizer`** redirects to **`/dashboard/events`**, preserving **`created` / `updated` / `archived` / `deleted`** query flags.
- **`/dashboard/events`** shows dismissible flash banners for those flags.
- **Header** “Create/Edit Event” → **`/dashboard/events`**; nav highlight includes **`/dashboard/events`** and **`/organizer/*`**.
- **Cancel / success redirects / back links** from **`/organizer`** → **`/dashboard/events`**; copy **My events** where applicable.

**Verification:** `npx tsc --noEmit`, `npm run lint`.

---

## Role-Based Access Control (RBAC) — completed

### Context — what already exists

| Layer | Current state |
|-------|---------------|
| `PlatformRole` enum | `USER`, `ADMIN` on `User.platformRole` (default `USER`) |
| `EventRole` enum | `ORGANIZER`, `TREASURER`, `REGISTRAR`, `JUDGE`, `MARKETING` |
| `EventStaff` model | Links user + event + role; unique per `(eventId, userId, role)` — already supports multiple roles per user per event |
| `OrganizationMember` | `role` string: `"owner"` or `"member"` |
| Auth helpers | `canManageEvent`, `getUserEventRole`, `requireEventRole`, `requireOrgOwner`, `requireOrgMember` |
| Middleware | Redirects unauthenticated users from `/dashboard`, `/organizer`, `/admin` to `/login` — no role gating |
| Registration model | Separate from `EventStaff` — a judge can already register as an exhibitor independently |

### Plan

#### 1. Extend `PlatformRole` enum — add `ORGANIZER`

Current: `USER | ADMIN`  
New: `USER | ORGANIZER | ADMIN`

Mapping to the three site-level roles:
- **Registrant** = `USER` (default) — manage own account, vehicles, register/unregister
- **Organizer** = `ORGANIZER` — everything Registrant can do, plus create/manage own events and orgs
- **Site Admin** = `ADMIN` — full access to everything

Migration: `ALTER TYPE "PlatformRole" ADD VALUE 'ORGANIZER';`

#### 2. Create permission helper library — `src/lib/permissions.ts`

Pure functions, no DB calls, easy to test:

- `isSiteAdmin(user)` — true if `platformRole === ADMIN`
- `isOrganizer(user)` — true if `platformRole === ORGANIZER` or ADMIN
- `canCreateEvent(user)` — ORGANIZER or ADMIN
- `canAssignEventStaff(user, staffRoles)` — ORGANIZER role on that event, or ADMIN
- `hasEventRole(staffRoles, role)` — check if role is in array
- `canJudge(staffRoles)` — JUDGE in staffRoles
- `canManageFinances(staffRoles)` — TREASURER in staffRoles
- `canManageAttendees(staffRoles)` — REGISTRAR in staffRoles
- `canEditPromo(staffRoles)` — MARKETING in staffRoles

#### 3. Create event staff data layer — `src/lib/event-staff.ts`

DB helpers:

- `getUserEventRoles(userId, eventId)` — returns `EventRole[]`
- `addEventStaffRole(eventId, userId, role)` — upsert
- `removeEventStaffRole(eventId, userId, role)` — delete
- `getEventStaffList(eventId)` — returns `{ user, roles[] }[]`

Replace single-role `getUserEventRole` in auth.ts with plural version.

#### 4. API endpoint — `GET/POST/DELETE /api/events/[id]/staff`

- POST `{ userId, role }` — add a staff role
- DELETE `{ userId, role }` — remove a staff role
- GET — list all staff with roles

Auth: caller must be ORGANIZER on the event or Site Admin.

#### 5. Update existing auth checks

- `canManageEvent` — also allow Site Admin (`ADMIN` platformRole)
- Event CRUD API routes: require ORGANIZER platformRole (create), ORGANIZER staff or ADMIN (edit/delete)
- Org CRUD: require ORGANIZER platformRole (create), org owner or ADMIN (edit/delete)
- Registration export: allow REGISTRAR or ORGANIZER staff or ADMIN

#### 6. Auto-assign ORGANIZER staff role on event creation

Verify existing POST /api/events already does this; keep it.

#### 7. Protect "Create Event" in UI

Only show for ORGANIZER or ADMIN platformRole users.

#### 8. Event Staff Management UI

New page at `/organizer/events/[id]/staff`:
- List current staff with role badges
- Add user by email, assign roles via checkboxes
- Remove roles from users

#### 9. Vitest tests

- `src/lib/permissions.test.ts`
- `src/lib/event-staff.test.ts`

### Todo

- [x] 1. Prisma migration: add ORGANIZER to PlatformRole enum
- [x] 2. Create `src/lib/permissions.ts` with pure permission functions
- [x] 3. Create `src/lib/event-staff.ts` with DB helpers for multi-role support
- [x] 4. Update `src/lib/auth.ts` — canManageEvent allows ADMIN; deprecate single-role getUserEventRole
- [x] 5. Create GET/POST/DELETE /api/events/[id]/staff endpoint
- [x] 6. Update existing API routes to use new permission helpers
- [x] 7. Protect Create Event UI for ORGANIZER/ADMIN only
- [x] 8. Create Event Staff Management page
- [x] 9. Add Vitest tests for permissions and event-staff helpers

### Key design decisions

1. **Registrant = `USER`** — no schema change needed for the default role
2. **ORGANIZER platformRole gates event/org creation** — not every user can create events
3. **Event roles remain scoped via EventStaff** — `@@unique([eventId, userId, role])` naturally supports multiple roles per user per event
4. **Judge + exhibitor already possible** — EventStaff and Registration are separate models
5. **Site Admin bypasses all checks** — simplest admin pattern

### Review

**Summary of changes:**

- **`prisma/schema.prisma`** — `PlatformRole` enum extended with `ORGANIZER` between `USER` and `ADMIN`.
- **`prisma/migrations/20260505190000_platform_role_organizer/migration.sql`** — `ALTER TYPE` adds the new enum value.
- **`src/types/index.ts`** — `PlatformRole` type updated to include `"ORGANIZER"`.
- **`src/lib/permissions.ts`** (new) — Pure permission functions: `isSiteAdmin`, `isOrganizerOrAbove`, `canCreateEvent`, `canCreateOrganization`, `canAssignEventStaff`, `canEditEvent`, `hasEventRole`, `isEventOrganizer`, `canJudge`, `canManageFinances`, `canManageAttendees`, `canEditPromo`.
- **`src/lib/event-staff.ts`** (new) — DB helpers: `getUserEventRoles` (returns `EventRole[]`), `addEventStaffRole` (upsert), `removeEventStaffRole`, `getEventStaffList` (grouped by user), `findUserByEmail`.
- **`src/lib/auth.ts`** — Added `getUserEventRoles` (plural, returns array); deprecated `getUserEventRole` (singular); `requireEventRole` now checks against array; `canManageEvent` and `canManageEventAndLoad` accept optional `platformRole` param for admin bypass.
- **`src/app/api/events/[id]/staff/route.ts`** (new) — GET/POST/DELETE for managing event staff roles; auth requires ORGANIZER staff or site admin.
- **`src/app/api/events/route.ts`** — POST now requires `canCreateEvent` (ORGANIZER/ADMIN platformRole).
- **`src/app/api/events/[id]/route.ts`** — PATCH/DELETE pass `user.platformRole` to `canManageEvent`.
- **`src/app/api/events/[id]/upload/route.ts`** — Pass `platformRole` to `canManageEvent`.
- **`src/app/api/events/[id]/tiers/route.ts`** — Pass `platformRole` to `canManageEvent`.
- **`src/app/api/events/[id]/tiers/[tierId]/route.ts`** — Pass `platformRole` to `canManageEvent`.
- **`src/app/api/events/[id]/registrations/export/route.ts`** — Now allows REGISTRAR staff role in addition to ORGANIZER/admin.
- **`src/app/api/organizations/route.ts`** — POST requires `canCreateOrganization`.
- **`src/app/api/organizations/[orgId]/route.ts`** — PATCH/DELETE allow site admin bypass via `isSiteAdmin`.
- **`src/app/organizer/events/new/page.tsx`** — Server-side redirect if user lacks ORGANIZER/ADMIN.
- **`src/app/organizer/events/[id]/edit/page.tsx`** — Added "Manage event staff & roles" link; passes `platformRole` to auth checks.
- **`src/app/organizer/events/[id]/staff/page.tsx`** (new) — Server page for event staff management.
- **`src/components/forms/event-staff-manager.tsx`** (new) — Client component: add staff by email + role, list staff with role badges, remove individual roles.
- **`src/app/organizer/events/[id]/organization/page.tsx`** — Pass `platformRole` to `canManageEventAndLoad`.
- **`src/app/organizer/events/[id]/registrations/page.tsx`** — Pass `platformRole`.
- **`src/app/organizer/events/[id]/tiers/page.tsx`** — Pass `platformRole`.
- **`src/app/dashboard/events/page.tsx`** — Passes `canCreate` prop to EventsOverview.
- **`src/components/dashboard/events/events-overview.tsx`** — "Create event" link conditionally rendered via `canCreate`.
- **`src/components/dashboard/events/event-rows.tsx`** — EmptyManaging "Create your own event" conditionally rendered via `canCreate`.
- **`src/app/dashboard/clubs/page.tsx`** — "Create New Event" and "Add New Car Club" conditionally rendered via `canCreateEvent`/`canCreateOrganization`.
- **`src/components/layout/site-header.tsx`** — Passes `platformRole` to Header.
- **`src/components/layout/header.tsx`** — "Create/Edit Event" nav link only shown for ORGANIZER/ADMIN.
- **`src/lib/permissions.test.ts`** (new) — 11 Vitest tests covering all permission functions.

**Apply migration:** `npx prisma migrate deploy && npx prisma generate` (then restart dev server).

**Verification:** `npx tsc --noEmit`, `npm run lint`, `npx vitest run` — all pass (30 tests, 0 errors).

---

## My Profile – Edit-Mode Toggle & My Clubs Section

### Plan

1. **Edit icon toggle on Account section**
   - All account fields are read-only (displayed as text) by default.
   - A pencil/edit icon in the card header toggles edit mode.
   - In edit mode, fields become editable inputs and Save Changes / Cancel buttons appear.
   - Cancel resets all values to their saved state and exits edit mode.
   - Save submits, and on success exits edit mode.
   - [x] Implement

2. **My Clubs section below Account**
   - Fetch `OrganizationMember` records server-side in `profile/page.tsx`.
   - Pass memberships to a new `MyClubsSection` component.
   - Each club card shows club name (with state) and the user's role.
   - [x] Implement

### Review

**Files changed:**

- **`src/components/profile/account-section-form.tsx`** — Added `editing` state (default `false`). When not editing, all fields render as read-only text with a pencil icon button to enter edit mode. In edit mode, the full editable form appears with both "Save changes" and "Cancel" buttons. Cancel resets all values to their saved state. Save exits edit mode on success.
- **`src/app/dashboard/profile/page.tsx`** — Renamed card title from "Account" to "Account information". Added Prisma query to fetch user's `OrganizationMember` records with organization name/state. Added a second `Card` section titled "My clubs" rendering the new `MyClubsSection` component.
- **`src/components/profile/my-clubs-section.tsx`** (new) — Client component that renders a list of club memberships. Each row shows the club name with state abbreviation (e.g., "PCA New Jersey (NJ)") and the user's role (owner/member). Empty state shows a message and link to browse clubs.

---

## My Clubs – Edit, Search & Join Clubs

### Plan

1. **Edit Club button for owners** — Show an "Edit club" link for any club where the user's role is `owner`.
2. **Search API** — `GET /api/organizations/search?q=...` returns matching clubs by name/city/state (excludes clubs user already belongs to).
3. **Join API** — `POST /api/organizations/[orgId]/join` adds the current user as a `member` of the club.
4. **"+" Add Club UI** — A plus button in the My Clubs card header opens an inline panel with two options:
   - Search for an existing club (by name + city/state) and join it as a member.
   - Create a new club (links to `/dashboard/clubs/new`).
5. All changes are minimal and simple.

### Review

**Files changed:**

- **`src/components/profile/my-clubs-section.tsx`** — Rewritten. Owners see a pencil/edit icon linking to `/dashboard/clubs/[orgId]/edit`. A "+" button in the header toggles an inline panel with search-for-existing-clubs and create-new-club options. Search results show club name, state, and city with a "Join" button. Joining adds the user as a `member` and updates the list in-place.
- **`src/app/dashboard/profile/page.tsx`** — Imports `canCreateOrganization` and passes `canCreate` prop to `MyClubsSection`.
- **`src/app/api/organizations/search/route.ts`** (new) — `GET` endpoint that searches organizations by name/city/state (case-insensitive, excludes clubs user already belongs to, excludes archived). Returns up to 20 results.
- **`src/app/api/organizations/[orgId]/join/route.ts`** (new) — `POST` endpoint that creates an `OrganizationMember` record with role `member`. Validates club exists, is not archived, and user isn't already a member.

---

## Dashboard My Clubs – View/Edit Icons, Add Club, Club View Page

### Plan

1. Club view page at `/dashboard/clubs/[orgId]` — read-only detail page for any club member.
2. Dashboard clubs list — replace text buttons with icon buttons (Eye for view, Pencil for edit).
3. Add "Add club" button with search + join + create-new-club panel.
4. Both profile and dashboard My Clubs sections now behave consistently.

### Review

**Files changed:**

- **`src/app/dashboard/clubs/[orgId]/page.tsx`** (new) — Read-only club view page. Shows club name, description, details (year founded, state, open to public, user role), meeting location, contact info, and social links. Owners also see an "Edit club" button in the header.
- **`src/components/dashboard/clubs/clubs-list.tsx`** (new) — Client component for the dashboard clubs list with interactive features: Eye (view) icon for all members, Pencil (edit) icon for owners only, "Add club" button with search/join panel and "Create a new club" link.
- **`src/app/dashboard/clubs/page.tsx`** — Refactored to use the new `ClubsList` client component. Serializes `archivedAt` dates for client consumption. Passes `canCreateEvent` and `canCreateOrg` permission flags.
- **`src/components/profile/my-clubs-section.tsx`** — Updated to also show Eye (view) icon linking to `/dashboard/clubs/[orgId]` for all members, consistent with the dashboard clubs page.

---

## NADA Vehicle Valuation API – Cascading Dropdowns

### Plan

1. Add `NADA_VALUATION_API_KEY` placeholder to `.env.local`.
2. Create `src/lib/nada-api.ts` — server-side helper that calls the NADA API with the key.
3. Create three proxy API routes: `/api/vehicles/lookup/makes`, `/models`, `/trims`.
4. Update `AddVehicleForm` — cascading dropdowns (year→make→model→trim) with "My vehicle is not listed" checkbox fallback to free-form text fields.

### Review

**Files changed:**

- **`.env.local`** — Added `NADA_VALUATION_API_KEY=` placeholder line. Paste your API key here.
- **`src/lib/nada-api.ts`** (new) — Server-side NADA API client. Functions: `getMakesByYear(year)`, `getModelsByMakeYear(companynum, year)`, `getTrimsByModel(companynum, year, modelcat)`, `isNadaConfigured()`. Sends `authentication_key` header. Results cached for 24h via Next.js `revalidate`.
- **`src/app/api/vehicles/lookup/makes/route.ts`** (new) — `GET ?year=YYYY` → returns makes from NADA. Auth required. Returns 503 if API key not set.
- **`src/app/api/vehicles/lookup/models/route.ts`** (new) — `GET ?companynum=X&year=YYYY` → returns models from NADA.
- **`src/app/api/vehicles/lookup/trims/route.ts`** (new) — `GET ?companynum=X&year=YYYY&modelcat=X` → returns trims from NADA.
- **`src/components/forms/add-vehicle-form.tsx`** — Rewritten with cascading dropdown logic:
  - **Year** (text input): When 4 digits are entered, auto-fetches makes for that year.
  - **Make** (dropdown): Populated from NADA. Selecting a make fetches models.
  - **Model** (dropdown): Populated from NADA. Selecting a model fetches trims.
  - **Trim** (dropdown): Populated from NADA, optional.
  - **"My vehicle is not listed"** checkbox: Switches all four fields to free-form text inputs.
  - If the API key is not configured (503), fields silently degrade to text inputs.

---

## Event Details: Staffing, Registration Categories & Awards/Trophies

### Overview

Add three new sections to the event create/edit flow:

1. **Event Staffing** — Already exists as a separate page. Integrate the staff manager directly into the event edit page as a collapsible section.

2. **Registration Categories** — New feature allowing organizers to select judging/registration categories for their event (e.g., Domestic, Import, 1950s, 1960s) from a site-admin-managed master list, or create custom categories. Each category has a configurable trophy count.

3. **Event Awards/Trophies** — Auto-generated from categories (e.g., "Best Domestic - 1st Place, 2nd Place, 3rd Place") plus special awards from a site-admin-managed list (e.g., President's Choice, Best in Show, Kid's Choice, People's Choice) or custom awards.

### Plan

#### Step 1: Database Schema Changes
Add new Prisma models:
- `Category` — Master list of registration categories (`id`, `name`, `isSystem` flag for admin-managed)
- `EventCategory` — Junction linking event to selected categories (`eventId`, `categoryId` or `customName`, `trophyCount`)
- `SpecialAward` — Master list of special awards (`id`, `name`, `isSystem` flag)
- `EventAward` — Junction for event's special/custom awards (`eventId`, `specialAwardId` or `customName`)

#### Step 2: Seed Default Data
Create seed data for default categories and special awards:
- **Categories**: Domestic, Import, 1950s, 1960s, 1970s, 1980s, 1990s, 2000s, Truck/SUV, Motorcycle, Custom/Hot Rod, Muscle Car, Classic, Exotic/Supercar, Euro, JDM
- **Special Awards**: President's Choice, Best in Show, Kid's Choice, People's Choice, Longest Distance, Best Engine, Best Paint, Best Interior

#### Step 3: API Routes
- `GET/POST/DELETE /api/events/[id]/categories` — Manage event categories (multi-select + custom + trophy count)
- `GET/POST/DELETE /api/events/[id]/awards` — Manage event awards (auto-derived + special + custom)
- `GET /api/categories` — List available categories (for multi-select)
- `GET /api/awards` — List available special awards (for multi-select)

#### Step 4: UI Components
- `EventCategoriesSection` — Multi-select from master list, "+ Category" for custom, trophy count per selection, remove button
- `EventAwardsSection` — Read-only derived awards from categories, multi-select special awards, "+ New Award" for custom, remove button
- Integrate `EventStaffManager` directly into event edit page as a collapsible card section (instead of separate page link)

#### Step 5: Integration
- Add all three sections (Staffing, Categories, Awards) to the event edit page as collapsible cards
- On the create event page, show these sections after the event is first saved (since they need an eventId)

### Todo Checklist
- [ ] Add `Category`, `EventCategory`, `SpecialAward`, `EventAward` models to Prisma schema
- [ ] Run `npx prisma migrate dev` to create migration
- [ ] Seed default categories and special awards
- [ ] Create `/api/categories` route (GET master list)
- [ ] Create `/api/awards` route (GET master list of special awards)
- [ ] Create `/api/events/[id]/categories` route (GET/POST/DELETE)
- [ ] Create `/api/events/[id]/awards` route (GET/POST/DELETE)
- [ ] Create `EventCategoriesSection` component
- [ ] Create `EventAwardsSection` component
- [ ] Integrate staffing, categories, and awards sections into event edit page
- [ ] Lint check all files

---

## Review: Event Staff — table UI, multi-role, event roles (May 2026)

### Summary of changes

- **Staff list** uses a responsive `<table>` (`EventStaffTable`) with columns First + last name, Email, Roles (badges), Actions (edit/remove with `title` + `aria-label`).
- **Add/Edit** flows use a **sheet** (`StaffMemberSheet`) with First/Last side-by-side, Email/Phone side-by-side on `sm+`, stacked on mobile; phone uses `UsPhoneInput` `(###) ###-####`; validation remains server-side Zod.
- **Roles** load server-side via `listEventRoleDefinitions` and are passed as `initialRoleDefinitions`; **`StaffRoleMultiSelect`** is a checkbox dropdown (`DropdownMenu` + `DropdownMenuCheckboxItem`) with “Add custom role” posting to `/api/events/[id]/staff/roles`.
- **Dashboard “Managing” tab** (`dashboard/events/page.tsx`) now queries `eventStaffMember` + role links; **`ManagingEventRow.roles`** is `StaffRoleBadgeRow[]` with **`sortStaffRoleBadgeRowsForDisplay`** for ordering.
- **`canManageEvent`** (`auth.ts`) treats organizers via **`userHasOrganizerStaffRole`** (slug `organizer`) instead of removed `eventStaff`.
- **New event** (`api/events/route.ts`) seeds default role definitions and assigns the creator the Organizer role via **`upsertStaffMemberWithRoles`**.

### Files touched (primary)

- `src/components/forms/event-staff-manager.tsx`, `event-staff-table.tsx`, `staff-member-sheet.tsx`, `staff-role-multi-select.tsx`
- `src/app/organizer/events/[id]/edit/page.tsx`, `staff/page.tsx`
- `src/app/dashboard/events/page.tsx`, `src/components/dashboard/events/event-rows.tsx`
- `src/lib/event-role-labels.ts`, `src/lib/auth.ts`, `src/lib/event-staff.ts`, `src/app/api/events/route.ts`

### Verification

- `npx tsc --noEmit` — pass  
- `npm run build` — pass  
- Targeted eslint on modified staff files — pass  
- **Note:** Repo-wide `npm run lint` may still report unrelated pre-existing issues.

### How to test

- **`/organizer/events/[eventId]/edit`** — Collapsible “Event Staffing”  
- **`/organizer/events/[eventId]/staff`** — Dedicated staff page  

### Limitations

- Staff is still matched by **existing user email** (product rule).  
- **Custom roles** (no slug) do not map to `EventRole` permission enums unless extended later.

---

## Site Admin Dashboard

### What was done

- [x] **Admin card on dashboard** — Added a "Site Admin" card (with `ShieldCheck` icon) to the main dashboard grid, visible only when `user.platformRole === "ADMIN"`, linking to `/admin`.
- [x] **Admin layout updated** — `admin/layout.tsx` now has "Admin Home", "Categories", and "Awards" nav links plus a "Back to dashboard" link.
- [x] **Admin index page** (`/admin/page.tsx`) — Single-page admin hub with 6 expandable `CollapsibleCard` sections: Clubs, Events, Accounts, Awards, Vehicles, Global Settings.
- [x] **Clubs section** — Search clubs by name, view member/event counts, delete clubs. API: `/api/admin/clubs` (GET, DELETE).
- [x] **Events section** — Search events by name, inline-edit status via dropdown, delete events. API: `/api/admin/events` (GET, PATCH, DELETE).
- [x] **Accounts section** — Search users by name or email, inline-edit platform role (USER/ORGANIZER/ADMIN), delete accounts (self-delete blocked). API: `/api/admin/accounts` (GET, PATCH, DELETE).
- [x] **Vehicles section** — Search vehicles by make/model/nickname, view owner info, delete. API: `/api/admin/vehicles` (GET, DELETE).
- [x] **Awards section** — Reuses existing `AdminAwardList` component with `initialAwards` prop.
- [x] **Global Settings: Registration Categories** — Reuses existing `AdminCategoryList` component.
- [x] **Global Settings: Default Staff Roles** — New CRUD section for managing the default role template. API: `/api/admin/staff-roles` (GET, POST, PATCH, DELETE). Helper: `src/lib/admin-staff-roles.ts`.

### Files created

- `src/app/admin/page.tsx` — Admin hub page
- `src/app/api/admin/clubs/route.ts` — Clubs API
- `src/app/api/admin/events/route.ts` — Events API
- `src/app/api/admin/accounts/route.ts` — Accounts API
- `src/app/api/admin/vehicles/route.ts` — Vehicles API
- `src/app/api/admin/staff-roles/route.ts` — Staff roles API
- `src/lib/admin-staff-roles.ts` — In-memory default role template CRUD
- `src/components/admin/admin-search-table.tsx` — Shared search hook + search bar
- `src/components/admin/admin-clubs-section.tsx` — Clubs admin UI
- `src/components/admin/admin-events-section.tsx` — Events admin UI
- `src/components/admin/admin-accounts-section.tsx` — Accounts admin UI
- `src/components/admin/admin-vehicles-section.tsx` — Vehicles admin UI
- `src/components/admin/admin-staff-roles-section.tsx` — Staff roles admin UI

### Files modified

- `src/app/dashboard/page.tsx` — Added Site Admin card
- `src/app/admin/layout.tsx` — Updated navigation

### Verification

- `npx tsc --noEmit` — pass
- Targeted lint on all new/modified files — pass
- Pre-existing lint errors in `account-section-form.tsx` remain (not related)

### How to test

- Navigate to `/dashboard` as an ADMIN user — "Site Admin" card should appear
- Click into `/admin` — all 6 collapsible sections visible
- Expand each section, search, and verify results load
- Test inline-edit on Events (status) and Accounts (role)
- Test delete on any entity
- Under Global Settings, add/edit/remove default staff roles

### Limitations

- Default staff roles are stored in process memory — they reset on server restart. For production, persist to a `default_staff_roles` DB table.
- Search results are capped at 50 rows per query.
- No "Add new" forms for Clubs/Events/Vehicles from the admin (managed through their own pages). Admin focuses on search/edit/delete.

---

## Phase: Vehicle Registration Process Overhaul

**Goal:** Transform the basic registration form into a polished, multi-step wizard that guides exhibitors through registering their vehicles for a car show event.

### Current State
- Single-page form with raw radio buttons for tiers and plain checkboxes for vehicles
- No visual step indicator or progress
- No success/confirmation page after registering
- "Add new vehicle" inline form is basic (no validation feedback, make field limited to 12 chars)
- No event summary visible during registration
- No category selection for vehicles

### Plan

#### Step 1: Multi-step registration wizard
- [ ] Create a `RegistrationWizard` component with 3 steps:
  1. **Select Tier** — card-based tier selection with price badge, open/close window info
  2. **Select Vehicles** — improved vehicle cards with checkboxes + polished "Add Vehicle" inline form
  3. **Review & Submit** — summary of tier, selected vehicles, and submit button
- [ ] Add a step indicator bar at the top (Step 1 of 3, Step 2 of 3, etc.)
- [ ] Add Next/Back navigation between steps
- [ ] Keep existing API contract unchanged (POST /api/events/[id]/register)

#### Step 2: Improved tier selection UI
- [ ] Replace plain radio buttons with selectable cards
- [ ] Show price prominently with badge styling
- [ ] Show open/close window dates when available
- [ ] Show "Club members only" indicator when applicable
- [ ] Disable closed tiers with visual indicator

#### Step 3: Improved vehicle selection UI
- [ ] Replace plain checkbox list with vehicle cards (year make model trim)
- [ ] Better "Add Vehicle" form with proper validation, wider make field (was 12 chars, should be 100)
- [ ] VIN field optional in inline form
- [ ] Remove button per new vehicle row

#### Step 4: Review & confirmation
- [ ] Review step shows: event name, selected tier + price, list of vehicles
- [ ] Success page after registration with confirmation details and link back to event
- [ ] Show registration status (Confirmed for free, Pending for paid)

#### Step 5: Show event context during registration
- [ ] Display event name, date, location in a compact header throughout the wizard

### Files to modify
- `src/components/forms/register-event-form.tsx` — rewrite into wizard
- `src/app/(public)/events/[id]/register/page.tsx` — pass event details to form
- New: `src/app/(public)/events/[id]/register/success/page.tsx` — confirmation page

### Files NOT changed
- `src/app/api/events/[id]/register/route.ts` — API stays the same
- `src/lib/validation/registration.ts` — validation stays the same
- `prisma/schema.prisma` — no schema changes needed
