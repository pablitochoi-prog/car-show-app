# Admin table sorting & filtering — implementation plan

**Status:** Pass 1 implemented (Events + Users).

---

## Pass 1 implementation summary (2026-05-31)

### Delivered
- `src/lib/admin-table/` — param parsing, query builders, tests
- `src/components/admin/data-table/` — column menu, toolbar, pagination, URL hooks, fetch hook
- Converted **Events** and **Users** admin sections
- Removed Users SSR `initialAccounts` preload

### URL prefixes
- `events_*` and `users_*` (e.g. `events_sort`, `users_f.status`)

### Deferred to follow-up
- Registrant count **sorting** (display only)
- Organizer column **sorting** (filter only; relation sort needs pass 2)
- Vehicles, Clubs, Messages, Sale inquiries, config lists
- Column resize drag (width stored in localStorage; resize handle UI minimal)
- DB indexes for User email/createdAt (document only)

---

## Original plan (reference) One reusable admin data-table pattern with consistent sort, filter, search, pagination, column resize/hide, and URL-backed state. Server-side query building for large datasets; shared UI even when a table is intentionally small.

---

## 1. Existing admin tables (audit)

### A. Data tables using `useAdminSearch` + `SortableHeader` (client-side sort)

| Section | Component | API | Current load limit | Server filter | Client sort |
|---------|-----------|-----|-------------------|---------------|-------------|
| **Events** | `admin-events-section.tsx` | `GET /api/admin/events` | `take: 100` | `q` → event name only | All columns via `sortRows()` |
| **Users** | `admin-accounts-section.tsx` | `GET /api/admin/accounts` | `take: 100` (+ SSR `initialAccounts`) | `q` → name/email OR | All columns via `sortRows()` |
| **Vehicles** | `admin-vehicles-section.tsx` | `GET /api/admin/vehicles` | `take: 100` | `q` → make/model/VIN/nickname | Client sort |
| **Clubs** | `admin-clubs-section.tsx` | `GET /api/admin/clubs` | `take: 100` | `q` → org name only | Client sort |

**Shared primitives today:**
- `useAdminSearch` — fetch on mount; optional `?q=` text search; no pagination; no URL sync
- `AdminSearchBar` — submit-to-search form
- `SortableHeader` — click header cycles asc/desc/none; **client-only** `sortRows()`
- Row actions preserved inline (edit, archive, delete, etc.)

### B. Dedicated admin pages (no shared table pattern yet)

| Page | Component | Data loading | Notes |
|------|-----------|--------------|-------|
| `/admin/messages` | `AdminMessagesClient` | SSR `findMany` `take: 200` | Full inbox list; no search/sort UI |
| `/admin/sale-inquiries` | `AdminSaleInquiriesList` | SSR `loadSaleInquiriesForAdmin()` `take: 500` | Card/list layout, not `<table>` |
| `/admin/sale-inquiries/[id]` | detail page | single record | — |

### C. Config / master-data UIs (not tabular — out of scope for pass 1)

| Section | Component | Pattern |
|---------|-----------|---------|
| Registration Categories | `AdminCategoryFolders` + `AdminCategoryList` | Draggable card lists |
| Registration Tier Templates | `AdminTierTemplatesSection` | Draggable card list |
| Award Categories | `AdminAwardList` | Draggable card list |
| Default Staff Roles | `AdminStaffRolesSection` | Simple list |
| Global Settings | fee/stripe/sponsor editors | Forms, not tables |
| Awards (dashboard tile) | `AdminAwardsSection` | Placeholder / future |

### D. Permissions (unchanged)

All `/api/admin/*` routes gate on `getCurrentUser()` + `isSiteAdmin(user)`. New list endpoints must keep this guard and must not broaden row visibility.

---

## 2. Gaps in current approach

1. **Hard cap at 100 rows** — silent truncation as data grows; no “showing 1–25 of 4,812”.
2. **Sort is client-only** — only sorts the fetched page, not the full dataset; misleading for admins.
3. **Single global `q` param** — no per-column filters; events cannot filter by status/club/organizer on server.
4. **No URL state** — refresh loses sort/filter; cannot share a filtered admin view.
5. **No pagination** — required before scaling to thousands of rows.
6. **No column menu UX** — sort is whole-header click; no filter/clear per column.
7. **No column resize / hide** — wide tables (events) overflow on smaller desktops.
8. **Multiple tables on one page** (`/admin`) — URL params must be **prefixed per table** to avoid collisions.

---

## 3. Recommended reusable building blocks

Names follow existing `admin-*` / `useAdmin*` conventions.

### Client (`src/components/admin/data-table/`)

| Export | Role |
|--------|------|
| **`AdminDataTable`** | Shell: toolbar, `<table>`, pagination footer, active-filter badges, “Clear all filters” |
| **`AdminTableHeaderCell`** | Column label + **`AdminColumnMenu`** trigger |
| **`AdminColumnMenu`** | Dropdown (reuse `DropdownMenu`): Sort asc, Sort desc, Filter…, Clear filter |
| **`AdminColumnFilterInput`** | Compact text / select / date input inside menu or popover |
| **`AdminTableToolbar`** | Global search input + page-size select + column visibility toggle |
| **`useAdminTableQuery`** | Read/write prefixed search params via `useSearchParams` + `useRouter`; debounced filter updates |
| **`useAdminTableColumns`** | Column resize (drag handle) + hide/show; persist to `localStorage` keyed by `tableId` |

### Server (`src/lib/admin-table/`)

| Export | Role |
|--------|------|
| **`parseAdminTableParams(searchParams, config)`** | Safe parse of `sort`, `sortDir`, `page`, `pageSize`, `q`, column filters |
| **`buildAdminTableQuery(config, params)`** | Returns `{ where, orderBy, skip, take }` for Prisma |
| **`adminTablePaginatedResponse(rows, total, params)`** | Standard JSON: `{ rows, total, page, pageSize, totalPages }` |
| **`defineAdminTable(config)`** | Declarative column registry: id, label, sortable, filterable, filterType, prisma mapping |

### Types

```ts
type AdminTableFilterType = "text" | "enum" | "date" | "dateRange" | "boolean";

type AdminTableColumnDef = {
  id: string;                    // URL key + sort key (whitelisted)
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: AdminTableFilterType;
  defaultVisible?: boolean;
  minWidth?: number;
  // server mapping — never derived from raw URL strings at query time
  prisma?: { sort?: ...; filter?: ... };
};
```

### Deprecation path (not immediate delete)

- Keep `AdminSearchBar` / `useAdminSearch` working during migration.
- Replace `SortableHeader` usage in converted tables with `AdminTableHeaderCell`.
- Mark `sortable-header.tsx` as legacy once all tabular sections migrate.

---

## 4. URL search params convention

### Per-table prefix

Tables embedded on `/admin` share one URL. Use a short prefix:

| Table | Prefix | Example |
|-------|--------|---------|
| Events | `ev` | `?ev_sort=startDate&ev_sortDir=desc&ev_page=2` |
| Users | `usr` | `?usr_q=smith&usr_filter.status=ACTIVE` |
| Vehicles (later) | `veh` | … |
| Clubs (later) | `club` | … |

Dedicated pages (`/admin/messages`, `/admin/sale-inquiries`) can use unprefixed params: `sort`, `sortDir`, `page`, …

### Standard params (per prefix)

| Param | Example | Notes |
|-------|---------|-------|
| `{p}_sort` | `name` | Whitelisted column id only |
| `{p}_sortDir` | `asc` \| `desc` | Default `desc` for dates, `asc` for names |
| `{p}_page` | `1` | 1-based; **reset to 1** when any filter changes |
| `{p}_pageSize` | `25` | Default `25`; clamp `1–100` |
| `{p}_q` | free text | Global quick search (existing behavior, debounced 300ms) |
| `{p}_f.{columnId}` | `PUBLISHED` | Per-column filter; text = `contains`; enum = exact |

**Not in URL (localStorage):** hidden columns, column widths — keyed `admin-table:{tableId}:columns`.

### Behavior rules

1. Filter change → set `page=1`, preserve sort if valid.
2. Sort change → preserve filters; preserve page unless out of range after count changes.
3. Debounce `{p}_q` and text `{p}_f.*` updates (300ms) before `router.replace` to avoid history spam.
4. Active filters → badge count in toolbar + per-column menu indicator.

---

## 5. First pass scope (approved tables only)

**Do not convert all tables in one PR.** Pass 1:

1. Build shared components + server helpers + tests.
2. Convert **Events** and **Users** only.
3. Document rollout checklist for follow-up PRs.

### 5a. Events (`AdminEventsSection` → `AdminDataTable`)

**Server:** extend `GET /api/admin/events` with paginated query builder.

| Column id | Label | Sort | Filter | Prisma notes |
|-----------|-------|------|--------|--------------|
| `name` | Name | ✓ | text | `name contains` (+ include in `{p}_q`) |
| `location` | Location | ✓ | text | `OR city/state contains` |
| `startDate` | Date | ✓ | dateRange | `startDate` gte/lte (UTC date boundaries) |
| `registrants` | Registrants | ✓ | — | `_count.registrations` — sort via `orderBy` subquery or denormalized; **see risk below** |
| `orgName` | Club | ✓ | text | `organization.name contains` |
| `organizer` | Event Organizer | ✓ | text | `staffMembers` where organizer role + user name/email contains |
| `status` | Status | ✓ | enum | exact match on `EventStatus` enum |

**Default sort:** `startDate desc`.

**Row actions:** unchanged (edit link, reset voting, archive, delete).

**Registrant count sort:** Pass 1 — either (a) sort by `_count.registrations` if Prisma supports reliably, or (b) mark column sortable in UI but defer server sort to pass 1.1. Filtering by registrant count is out of scope for pass 1.

### 5b. Users / Accounts (`AdminAccountsSection` → `AdminDataTable`)

**Server:** extend `GET /api/admin/accounts`.

| Column id | Label | Sort | Filter | Prisma notes |
|-----------|-------|------|--------|--------------|
| `firstName` | First Name | ✓ | text | `firstName contains` |
| `lastName` | Last Name | ✓ | text | `lastName contains` |
| `email` | Email | ✓ | text | `email contains` |
| `platformRole` | Role | ✓ | enum | `USER` \| `ORGANIZER` \| `ADMIN` |
| `status` | Status | ✓ | enum | `ACTIVE` \| `SUSPENDED` \| `BANNED` |
| `createdAt` | Joined | ✓ | dateRange | `createdAt` gte/lte |

**Default sort:** `createdAt desc`.

**SSR note:** `admin/page.tsx` currently passes `initialAccounts` for faster first paint. Pass 1 can keep SSR for default view but client table should refetch from API when URL params ≠ defaults, or drop SSR initial rows in favor of consistent API-only fetch (simpler; slight UX tradeoff — document choice in PR).

**Row actions:** unchanged (inline edit, suspend/ban, detail drawer, delete dialog).

---

## 6. Server-side query requirements (pass 1)

For each converted `GET /api/admin/*` list route:

1. Parse params with **`parseAdminTableParams`** + table-specific **`defineAdminTable`** config.
2. Reject unknown `sort` / filter keys (400 or silently ignore — prefer **ignore** for shareable URLs).
3. Build `where` by AND-combining global `q` + column filters.
4. `Promise.all([ findMany({ where, orderBy, skip, take, select }), count({ where }) ])`.
5. Return `{ events|accounts, total, page, pageSize, totalPages }`.
6. **`select` only** fields needed for table + actions.
7. Avoid heavy nested includes — events organizer: minimal staff join (already done).

### Existing indexes (no migration in pass 1)

| Model | Useful indexes already |
|-------|------------------------|
| `Event` | `[status, startDate]`, `[city, state]`, `[orgId]` |
| `User` | none on `email`/`createdAt` — **recommend** index follow-up if user table > ~10k |
| `Vehicle` | `[userId]` |
| `Organization` | none explicit beyond PK |

**Recommendation (document only):** add `User @@index([createdAt])` and `User @@index([email])` in a future approved migration if admin user list slows down.

---

## 7. Client UX details

### Column menu (desktop-primary)

```
[Column label]  [⋮]
  ↑ Sort ascending
  ↓ Sort descending
  ─────────────
  🔍 Filter…  → expands inline Input / Select
  ✕ Clear filter (hidden when inactive)
```

- Menu trigger: `aria-label="Column options for {label}"`.
- Active sort: header shows ↑/↓; `aria-sort` set.
- Active filter: funnel icon dot / badge on menu trigger.

### Toolbar

- Global search (existing placeholder text per table).
- “Filters active (n)” badge + **Clear all filters** button.
- Page size: 25 / 50 / 100.
- **Columns** dropdown: checkboxes to show/hide optional columns.

### Column resize

- Drag handle on header right edge; min width ~80px; width stored in localStorage.
- `<table style={{ tableLayout: 'fixed' }}>` with `<colgroup>`.

### Mobile

- Horizontal scroll retained (`overflow-x-auto`).
- Column menu remains usable; hide resize on narrow viewports optional.

---

## 8. Small / static tables (later passes)

Use **same UI components** but flag `mode: "client"` in config when dataset is bounded:

| Table | Est. size | Pass |
|-------|-----------|------|
| Tier templates | < 20 | Client mode OK |
| Staff roles | < 20 | Client mode OK |
| Award categories | < 100 | Client or server |
| Category folders | medium | Server in pass 3 |

---

## 9. Follow-up rollout order (after pass 1)

1. **Vehicles** — high value; owner relation filters
2. **Clubs** — organizer relation filter
3. **Sale inquiries** — convert list to table + paginated API (currently 500 cap)
4. **Messages** — paginated admin inbox
5. Embedded config lists — only if admins request tabular view

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| URL param collisions on `/admin` | Strict per-table prefix (`ev_`, `usr_`) |
| Prisma injection via sort/filter keys | Whitelist in `defineAdminTable`; never pass raw URL keys to Prisma |
| Organizer/club filter performance | Constrained `contains` + existing relations; limit pageSize |
| Registrant count sorting complexity | Defer or use raw query in follow-up |
| Breaking admin row actions | Pass 1 wraps existing row renderers; no action API changes |
| SSR / client hydration mismatch for Users | Single source: API fetch driven by URL, or hydrate only when params match default |
| Column hide breaks layout | Always show Actions column; min one data column visible |
| Debounced URL updates feel laggy | Apply sort/page immediately; debounce text filters only |

---

## 11. Testing plan

### Unit tests (`src/lib/admin-table/*.test.ts`)

- `parseAdminTableParams` — defaults, clamp pageSize, invalid sort ignored, filter parsing
- `buildAdminTableQuery` — events: name filter, status enum, date range, org relation
- `buildAdminTableQuery` — users: email filter, role enum, combined q + column filter
- Whitelist rejection — unknown sort key does not appear in `orderBy`

### Component tests (optional pass 1)

- `AdminColumnMenu` — sort actions call URL updater
- Filter input debounce (mock timers)

### Manual QA checklist

- [ ] Events: sort each column asc/desc; URL updates; refresh preserves state
- [ ] Events: filter status + club + organizer text; clears independently and “clear all”
- [ ] Events: pagination next/prev; filter resets page to 1
- [ ] Events: row actions still work (edit, archive, delete, reset voting)
- [ ] Users: same scenarios
- [ ] Users: inline edit / suspend / delete unchanged
- [ ] Non-admin receives 403 from new query shapes
- [ ] Column hide/resize persists after reload (localStorage)
- [ ] 0 results shows empty state with active filter hint

---

## 12. Implementation tasks (pass 1 — after approval)

- [ ] **T1** — `src/lib/admin-table/` types, `parseAdminTableParams`, `buildAdminTableQuery`, tests
- [ ] **T2** — `defineAdminTable` configs for `events` and `accounts`
- [ ] **T3** — `AdminColumnMenu`, `AdminTableHeaderCell`, `AdminDataTable`, `useAdminTableQuery`, `useAdminTableColumns`
- [ ] **T4** — Paginated `GET /api/admin/events`
- [ ] **T5** — Paginated `GET /api/admin/accounts`
- [ ] **T6** — Migrate `AdminEventsSection`
- [ ] **T7** — Migrate `AdminAccountsSection`
- [ ] **T8** — Manual QA + update this doc with “Implemented” notes

**Estimated diff size:** ~8–12 files, focused; no schema migration.

---

## 13. Open questions for approval

1. **Users SSR `initialAccounts`:** Drop in favor of API-only for consistency, or keep for default-empty-URL load?
2. **Registrant count sorting on Events:** Include in pass 1 or defer?
3. **URL prefix names:** `ev` / `usr` acceptable, or prefer full names `events_` / `users_`?
4. **Default page size:** 25 vs 50?

---

**Next step:** Review and approve this plan (and open questions). Implementation will not start until confirmed.
