# Award & Judging Architecture — Plan (Review Before Implementation)

## Summary

CarShowScout needs **three separate award/voting workflows**. Each is additive; none replaces existing public/SMS voting, registration, dash cards, or buyer inquiry.

| # | Workflow | Purpose | Data (new / existing) |
|---|----------|---------|------------------------|
| 1 | **Public Voting** | Attendees vote for vehicles | **Existing:** `VotingCategory`, `VehiclePublicVote`, `SmsVote` |
| 2 | **Structured Score Sheet Judging** | Assigned judges complete detailed score sheets | **New:** `JudgingTemplate` → `EventJudgingTemplate` → `JudgeScoreSheet` |
| 3 | **Assigned Judge Ballot Voting** | Assigned judges allocate vote blocks to favorite vehicles per award category | **New:** `JudgeBallotCategory` → `JudgeBallotAllocation` → `JudgeBallotVote` |

**Do not mix workflows #2 and #3.** They share event context, judge staff assignment, and vehicle entry codes — nothing else.

---

## Terminology (avoid confusion)

| Name in app | Meaning | Examples |
|-------------|---------|----------|
| `EventCategory` | **Registration / vehicle class** (existing) | Full Classic, Modified, Truck |
| `EventAward` / `SpecialAward` | **Trophy/award names** selected for event (existing) | People's Choice, Best in Show (master list) |
| `VotingCategory` | **Public/SMS voting category** (existing) | SMS option 1, 2, 3 |
| `EventJudgingClass` | Maps registration class → **score sheet template** (new) | Full Classic → PCA template |
| `JudgeBallotCategory` | **Judge ballot award category** (new) | Best Paint, Best Engine Bay, Best in Show |

---

## Current State (inspected)

| Area | Today |
|------|--------|
| Public voting | `VotingCategory` + `VehiclePublicVote` + SMS; `/v/[code]` public vote panel |
| Structured judging | `VehicleJudgeScore` only (1–100 + notes); no templates |
| Judge ballot | **Not implemented** |
| Registration class | `EventCategory` on `RegistrationVehicle` |
| Vehicle entry ID | `RegistrationVehicle.publicVehicleId` / `vehicleEntryCode` |
| Judge staff | `EventStaffMember` + `JUDGE` role via `EventStaffRoleLink` |
| Reports | `judging` report type exists but `available: false` |

---

## Three-Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EVENT (unchanged core)                            │
│  RegistrationVehicle.eventCategoryId  ·  publicVehicleId / entry code   │
│  EventStaffMember (JUDGE role)                                           │
└─────────────────────────────────────────────────────────────────────────┘
         │                        │                          │
         ▼                        ▼                          ▼
┌─────────────────┐   ┌──────────────────────┐   ┌─────────────────────────┐
│ PUBLIC VOTING   │   │ STRUCTURED SCORE     │   │ ASSIGNED JUDGE BALLOT   │
│ (existing)      │   │ SHEET JUDGING (new)  │   │ VOTING (new)            │
├─────────────────┤   ├──────────────────────┤   ├─────────────────────────┤
│ VotingCategory  │   │ JudgingTemplate      │   │ JudgeBallotCategory     │
│ VehiclePublicVote│  │  → EventJudgingTemplate│ │  → JudgeBallotAllocation│
│ SmsVote         │   │ EventJudgingClass    │   │  → JudgeBallotVote      │
│                 │   │ JudgeScoreSheet      │   │                         │
│ Attendee/phone  │   │ Assigned judge       │   │ Assigned judge          │
│ 1 vote/cat/phone│   │ Detailed deductions  │   │ Vote budget per category│
└─────────────────┘   └──────────────────────┘   └─────────────────────────┘
```

**Organizer UI (unified setup screen, separate backends):**

Event Admin → **Awards & Judging Setup** lists categories with mode:

- `PUBLIC_VOTING` → links to / extends existing SMS voting settings
- `ASSIGNED_JUDGE_BALLOT` → `JudgeBallotCategory` config
- `STRUCTURED_SCORE_SHEET` → `EventJudgingClass` + `EventJudgingTemplate` config

Optional thin umbrella table `EventAwardProgramItem` (post-MVP) for sorted display only — **not required for MVP**.

---

# Part A — Structured Score Sheet Judging

(Unchanged from prior plan — global clone → event copy → score sheet snapshots.)

## Architecture Principles

```
Global (master, reusable)          Event (live judging)
─────────────────────────          ────────────────────
JudgingTemplate                    EventJudgingTemplate  ← sourceTemplateId
  └ JudgingTemplateSection           └ EventJudgingSection
       └ JudgingTemplateItem              └ EventJudgingItem
            └ JudgingTemplateDeductionOption   └ EventJudgingDeductionOption

EventJudgingClass ──► EventJudgingTemplate (never JudgingTemplate)
RegistrationVehicle.eventCategoryId ──► EventJudgingClass

JudgeScoreSheet (snapshot at start) ──► sections / items / deductions
```

**Rule:** Live judging **never FKs to global templates**. Globals are clone sources only.

## Enums (score sheet)

```prisma
enum JudgingMethodology {
  DEDUCTION
  ADDITIVE
  ORIGINALITY_CONDITION
}

enum JudgeScoreSheetStatus {
  DRAFT
  SUBMITTED
  FINALIZED
}

enum EventJudgingTemplateEditLock {
  OPEN
  DRAFT_WARNING
  LOCKED
}
```

## Schema (score sheet) — summary

- `JudgingTemplate`, `JudgingTemplateSection`, `JudgingTemplateItem`, `JudgingTemplateDeductionOption` (global)
- `EventJudgingTemplate`, `EventJudgingSection`, `EventJudgingItem`, `EventJudgingDeductionOption` (event)
- `EventJudgingClass` (maps `EventCategory` → `EventJudgingTemplate`)
- `JudgeScoreSheet` + snapshot child tables

See prior sections in git history for full field lists. Legacy `VehicleJudgeScore` kept until migration.

## Score sheet — key behaviors

- Clone global template → event copy on organizer action
- Edit lock when submitted/finalized score sheets exist
- Snapshot template on sheet start
- Methodology-specific scoring in `src/lib/judging/calculate-score.ts`
- Seed 4 global templates: PCA, AACA, Marque Authenticity, Modified/Custom

---

# Part B — Assigned Judge Ballot Voting

## Architecture Principles

```
JudgeBallotCategory (per event award category)
  ├─ eligibility → EventCategory[] (optional filter)
  ├─ JudgeBallotCategoryJudge[] (MVP: which judges may vote; empty = all event judges)
  ├─ JudgeBallotAllocation (per judge × category vote budget)
  └─ JudgeBallotVote (per judge × category × vehicle voteCount)

Vehicle lookup: RegistrationVehicle.publicVehicleId (entry code) or QR → same code
```

**Separate from:** `VotingCategory`, `JudgeScoreSheet`, `VehicleJudgeScore`.

## Enums (judge ballot)

```prisma
enum JudgeBallotCategoryStatus {
  DRAFT      // organizer configuring
  OPEN       // judges may vote
  CLOSED     // voting stopped; edits blocked
  FINALIZED  // results locked; admin only
}

enum JudgeBallotAllocationStatus {
  ACTIVE
  SUBMITTED  // judge marked ballot complete (optional MVP)
  LOCKED     // category closed/finalized
}
```

## Schema (judge ballot)

```prisma
/// Judge-voted award category (Best Paint, Best in Show, etc.)
model JudgeBallotCategory {
  id                         String   @id @default(uuid())
  eventId                    String
  name                       String
  description                String?  @db.Text
  sortOrder                  Int      @default(0)
  isActive                   Boolean  @default(true)
  status                     JudgeBallotCategoryStatus @default(DRAFT)

  votesPerJudge              Int      // e.g. 5
  maxVotesPerJudgePerVehicle   Int      @default(1)  // e.g. 2

  startsAt                   DateTime?
  endsAt                     DateTime?
  showResultsToJudges        Boolean  @default(false)
  judgeGuidance              String?  @db.Text

  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt

  event          Event                        @relation(...)
  eligibleClasses JudgeBallotEligibleClass[]
  judgeAssignments JudgeBallotCategoryJudge[]  // MVP optional
  allocations    JudgeBallotAllocation[]
  votes          JudgeBallotVote[]

  @@index([eventId, sortOrder])
  @@index([eventId, status])
  @@map("judge_ballot_categories")
}

/// Which registration classes may receive votes in this category (empty = all classes)
model JudgeBallotEligibleClass {
  categoryId      String
  eventCategoryId String

  category      JudgeBallotCategory @relation(...)
  eventCategory EventCategory       @relation(...)

  @@id([categoryId, eventCategoryId])
  @@map("judge_ballot_eligible_classes")
}

/// Optional: restrict category to specific judges. Empty list = all assigned event judges.
model JudgeBallotCategoryJudge {
  categoryId  String
  judgeUserId String

  category JudgeBallotCategory @relation(...)
  judge    User                @relation(...)

  @@id([categoryId, judgeUserId])
  @@map("judge_ballot_category_judges")
}

/// Vote budget for one judge in one category
model JudgeBallotAllocation {
  id                  String @id @default(uuid())
  eventId             String
  categoryId          String
  judgeUserId         String
  totalVotesAllocated Int    // copied from category.votesPerJudge at open time
  votesUsed           Int    @default(0)
  status              JudgeBallotAllocationStatus @default(ACTIVE)
  submittedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  event    Event               @relation(...)
  category JudgeBallotCategory @relation(...)
  judge    User                @relation(...)

  @@unique([categoryId, judgeUserId])
  @@index([eventId, judgeUserId])
  @@map("judge_ballot_allocations")
}

/// One row per judge × category × vehicle; voteCount may be > 1
model JudgeBallotVote {
  id                    String   @id @default(uuid())
  eventId               String
  categoryId            String
  judgeUserId           String
  registrationVehicleId String
  vehicleEntryCode      String   // denormalized snapshot for audit/export
  voteCount             Int
  notes                 String?  @db.Text
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  event               Event               @relation(...)
  category            JudgeBallotCategory @relation(...)
  judge               User                @relation(...)
  registrationVehicle RegistrationVehicle @relation(...)

  @@unique([categoryId, judgeUserId, registrationVehicleId])
  @@index([categoryId, registrationVehicleId])
  @@index([eventId, categoryId])
  @@map("judge_ballot_votes")
}
```

### Event / User relations (additions)

```prisma
// Event:
judgeBallotCategories JudgeBallotCategory[]
judgeBallotAllocations JudgeBallotAllocation[]
judgeBallotVotes       JudgeBallotVote[]

// RegistrationVehicle:
judgeBallotVotes JudgeBallotVote[]

// EventCategory:
judgeBallotEligibleClasses JudgeBallotEligibleClass[]
```

## Validation rules (`src/lib/judging/judge-ballot-validation.ts`)

| Rule | Enforcement |
|------|-------------|
| Judge has `JUDGE` role on event | API auth |
| Category `status === OPEN` | API 403 if not |
| Judge assigned to category | If `JudgeBallotCategoryJudge` rows exist, judge must be listed; else any event judge |
| Vehicle eligible | If eligible classes configured, `RegistrationVehicle.eventCategoryId` must match |
| Total votes | `sum(voteCount)` for judge+category ≤ `totalVotesAllocated` |
| Per-vehicle max | `voteCount` for judge+category+vehicle ≤ `maxVotesPerJudgePerVehicle` |
| Edit window | Updates allowed while category `OPEN`; blocked when `CLOSED` or `FINALIZED` |
| Entry code resolves | Lookup via `VehicleEntryIndex` / `findVehicleEntryByCode` |

**Example:** Best Paint — `votesPerJudge: 5`, `maxVotesPerJudgePerVehicle: 2`

- Vehicle 101: 2 ✓
- Vehicle 112: 1 ✓
- Vehicle 145: 1 ✓
- Vehicle 188: 1 ✓
- Total: 5 ✓
- Vehicle 101: 3 ✗ (exceeds per-vehicle max)

**Allocation sync:** On vote upsert/delete, recompute `votesUsed` on `JudgeBallotAllocation` (transaction).

**Open category:** Create/update `JudgeBallotAllocation` for each eligible judge with `totalVotesAllocated = votesPerJudge`.

## Judge ballot — clone / lifecycle

1. Organizer creates `JudgeBallotCategory` (DRAFT)
2. Configures name, guidance, eligibility, votesPerJudge, max, judge assignments
3. Opens category → status OPEN, allocations created
4. Judges vote via mobile UI
5. Organizer closes → CLOSED (no edits) or finalizes → FINALIZED (locks results)

## Results (`src/lib/judging/judge-ballot-results.ts`)

Per category, aggregate:

| Column | Source |
|--------|--------|
| Rank | `sum(voteCount)` DESC |
| Vehicle entry code | `vehicleEntryCode` |
| Nickname | event copy on `RegistrationVehicle` |
| Y/M/M | `Vehicle` |
| Registration class | `EventCategory` name |
| Total judge votes | `sum(voteCount)` |
| Distinct judges | `count(distinct judgeUserId)` |
| Tie indicator | equal totals |
| Owner name | admin/organizer only |
| Vote spread by judge | admin only; hidden from judges unless `showResultsToJudges` |

**Privacy:** Do not expose judge names or per-judge votes publicly. Organizer/admin results may show spread; judge UI shows only own votes + totals if enabled.

## Judge ballot — API routes

| Route | Purpose |
|-------|---------|
| `GET /api/events/[id]/judge-ballot/categories` | Organizer list / config |
| `POST /api/events/[id]/judge-ballot/categories` | Create category |
| `PATCH /api/events/[id]/judge-ballot/categories/[catId]` | Update / open / close / finalize |
| `GET /api/judge/assignments` | Judge: my events + ballot categories + allocations |
| `GET /api/judge/events/[id]/ballot/[catId]` | Category detail + my votes + remaining |
| `PUT /api/judge/events/[id]/ballot/[catId]/votes` | Upsert vote for vehicle (voteCount) |
| `DELETE /api/judge/events/[id]/ballot/[catId]/votes/[vehicleId]` | Remove votes for vehicle |
| `POST /api/judge/events/[id]/ballot/[catId]/submit` | Optional: mark allocation submitted |
| `GET /api/events/[id]/judge-ballot/results` | Admin/organizer ranked results |
| `GET /api/events/[id]/judge-ballot/results/export` | CSV (post-MVP) |

Vehicle lookup: reuse `findVehicleEntryByCode` — same as public vote / dash card QR.

## Judge ballot — UI

### Organizer (`/organizer/events/[id]/awards-judging`)

- Tab or section: **Judge Ballot Categories**
- Create category form (name, guidance, votesPerJudge, maxPerVehicle, eligible classes, assigned judges)
- Open / Close / Finalize actions
- Link from existing event setup cards (alongside SMS voting)

### Judge mobile (`/judge` or `/dashboard/judging`)

**My Judging Assignments** hub:

1. Select event
2. See two sections (if configured):
   - **Ballot voting** → list of open `JudgeBallotCategory` with votes remaining
   - **Score sheets** → list of vehicles/classes needing score sheets
3. Ballot category screen:
   - Sticky footer: **X votes remaining**
   - Quick entry: vehicle number / entry code field
   - QR scan button (reuse camera → `/v/[code]` lookup pattern) — phase 6 if hard
   - Search by entry code, nickname, Y/M/M
   - List of current votes with +/- and remove
   - Validation toasts for over-allocation / per-vehicle max
   - Submit ballot (optional MVP)

---

# Part C — Public Voting (existing — no schema change)

Keep `VotingCategory`, SMS settings, and public vote panel unchanged. Organizer unified setup **links to** existing `EventSmsVotingSettings` rather than duplicating.

---

# Combined API & UI Index

## Score sheet APIs (Part A)

| Route | Purpose |
|-------|---------|
| `GET /api/admin/judging-templates` | Global templates (site admin) |
| `POST /api/events/[id]/judging-templates/clone` | Clone global → event |
| `PUT /api/events/[id]/judging-templates/[id]/structure` | Save event template tree |
| `GET/POST/PATCH /api/events/[id]/judging-classes` | Class ↔ template map |
| `POST /api/v/[code]/judge-score-sheet` | Start/update score sheet |
| `GET /api/events/[id]/judging/score-sheet-results` | Score sheet rankings |

## Shared judge hub

| Route | Purpose |
|-------|---------|
| `GET /api/judge/assignments` | Events + ballot categories + pending score sheets |

---

# Implementation Phases (revised)

### Phase 0 — Review
- [ ] User approves combined plan

### Phase 1A — Score sheet schema + seed
- [ ] JudgingTemplate global tables + event copy tables + JudgeScoreSheet snapshots
- [ ] Migration + seed 4 global templates
- [ ] `clone-judging-template-to-event.ts` + scoring tests

### Phase 1B — Judge ballot schema
- [ ] JudgeBallotCategory, EligibleClass, CategoryJudge, Allocation, Vote tables
- [ ] Migration (same or follow-on)
- [ ] `judge-ballot-validation.ts` + allocation sync tests

### Phase 2A — Organizer: score sheet setup
- [ ] Judging template builder UI
- [ ] EventJudgingClass mapping

### Phase 2B — Organizer: judge ballot setup
- [ ] Create/edit/open/close/finalize ballot categories
- [ ] Eligible class + judge assignment config
- [ ] Unified **Awards & Judging Setup** nav entry

### Phase 3A — Judge: score sheet mobile form
- [ ] Snapshot on start, methodology-aware form, sticky score footer

### Phase 3B — Judge: ballot mobile UI
- [ ] My Judging Assignments hub
- [ ] Ballot category screen with entry code lookup + vote +/- 
- [ ] Sticky votes-remaining footer
- [ ] QR scan (if not in first pass: entry code only)

### Phase 4A — Score sheet results
- [ ] Rankings by class, section breakdown, CSV

### Phase 4B — Judge ballot results
- [ ] Admin/organizer ranked results per category
- [ ] Tie indicator; admin-only vote spread
- [ ] CSV export (post-MVP ok)

### Phase 5 — Polish
- [ ] Drag-and-drop reorder (templates + ballot categories)
- [ ] Event clone includes judging config
- [ ] Deprecate legacy `VehicleJudgeScore`
- [ ] Public display / automated awards (future)

---

# Risk / Compatibility

| Risk | Mitigation |
|------|------------|
| Naming collision with `VotingCategory` | Judge ballot uses `JudgeBallotCategory`; docs + UI labels clarify |
| Naming collision with `EventAward` | `EventAward` = trophy pick list; ballot categories are separate |
| Mixing ballot + score sheet | Separate tables, separate API namespaces, shared hub UI only |
| Breaking SMS/public vote | No changes to `VotingCategory` / vote recording |
| Breaking registration | Only optional FKs from ballot votes → `RegistrationVehicle` |
| Outdoor mobile performance | Minimal payloads; entry code lookup indexed; optimistic UI |

---

# Open Questions

### Score sheet (prior)
1. Multiple templates per event (by class)? — Plan: **yes**
2. Unmapped registration class? — Block or default template?
3. Multiple judges per vehicle — average scores?
4. Legacy 1–100 panel — hide when templates configured?

### Judge ballot (new)
5. **MVP judge assignment:** All event judges vote all open categories, or per-category assignment from day one? — Plan: **per-category optional; empty = all judges**
6. **Submit vs auto-save:** Require explicit ballot submit or save on each change? — Plan: **auto-save on change; optional submit button**
7. **Eligible class empty:** All registered vehicles eligible? — Plan: **yes**
8. **Guest vehicles:** Support guest JSON vehicles via `VehicleEntryIndex`? — Plan: **yes**, same entry code lookup

---

# Review

_Pending implementation — awaiting user approval._

**Documents:** This file supersedes the score-sheet-only draft. Checklist in `tasks/todo.md`.
