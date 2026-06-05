# Release Notes — v1.0.0
**Date:** 2026-06-05
**Tag:** v1.0.0
**Commit:** 9537b53

---

## Overview

First stable release of the AI Project Management Platform — a local-first personal portfolio management tool for solo AI practitioners. Replaces Excel-based project tracking with a structured, searchable, browser-native application.

No accounts. No cloud. No subscriptions. All data lives in the browser's IndexedDB.

---

## What's Included

### Core Modules

**Dashboard**
- Portfolio overview with domain filter tabs (All / Personal / Work / General)
- Blocked projects band with reason display and days-blocked counter
- Focus Now card — surfaces the highest-priority active or scoped project with goal and next action
- Ready to Start section — shows scoped projects queued for activation
- High-priority ideas section — medium+ priority ideas, top 4 visible
- Stat cards: Total, Active, Blocked, Completed
- Domain-scoped views (switching tabs refilters all sections)

**Projects**
- Full CRUD with inline editing on all fields from the detail page
- Status workflow: idea → scoped → active → blocked → completed → deferred → archived
- Priority levels: critical / high / medium / low / unset
- Domain tagging: personal / work / general
- Fields: name, description, goal, next action, current phase, blocked reason
- Unified filter bar: status tabs + domain filter + sort (priority / updated / name)
- Cascade delete: removing a project removes all linked tasks, decisions, knowledge, and asset links
- Blocked status enforces reason entry before transition
- Completed and archived transitions show confirmation dialog

**Tasks**
- Cross-project task list and per-project task tab
- Status cycling via icon click: todo → in_progress → done → todo
- Blocked status with mandatory reason prompt
- Lucide status icons (Circle, CircleDot, CheckCircle2, XCircle)
- Filter tabs: Open / Blocked / Done
- Inline edit and delete with confirmation

**AI Assets**
- Asset library with type filter tabs: Prompt / Agent / GPT / Workflow / Tool / Model Config
- Asset status: idea / draft / active / deprecated
- Asset-to-project linking (many-to-many via project_assets join)
- Duplicate asset action
- Detail page with linked projects panel

**Decisions**
- Decision log with status tracking: active / superseded / reversed
- Fields: title, context, options considered, decision made, rationale, decided-at date
- Status filter tabs
- Project linkage (optional)

**Knowledge**
- Knowledge base with type tabs: Note / Process / Reference / Learning / Research
- Fields: title, body, source URL
- Project linkage (optional)
- Prose rendering for notes; monospace-friendly for process and reference types

**Global Search**
- ⌘K / Ctrl+K command palette from any screen
- Fuse.js fuzzy search across all 5 entity types simultaneously
- Pre-warmed index at app boot (no cold-start delay)
- Results sorted by confidence score across entity types
- Quick navigation shortcuts when query is empty
- Escape to close

**Settings**
- JSON export: full snapshot of all entities to a downloadable file
- JSON import: restores portfolio from a previously exported file
- Clear all data: hard reset with CONFIRM text guard
- Entity counts display

---

## Design System

- **Color space:** oklch throughout (perceptually uniform, future-proof)
- **Background:** `oklch(0.975 0.004 264)` — warm off-white, not pure white
- **Primary:** `oklch(0.50 0.20 264)` — indigo
- **Card system:** white cards on warm background, `.shadow-card` / `.shadow-card-hover` utilities
- **Tab pattern:** underline style (`border-b-2 border-primary`) across all list pages — no solid pills
- **Badges:** StatusBadge and PriorityBadge — pill with colored dot, 7 project statuses
- **Breadcrumbs:** All 4 detail pages (Projects, Assets, Decisions, Knowledge) have breadcrumb TopBar navigation
- **Action affordance:** Row action buttons visible at 30% opacity at rest, 100% on hover
- **Inline edit affordance:** Dashed underline + pencil icon at 25% opacity at rest

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.7 |
| UI library | React | 19.2.4 |
| Language | TypeScript (strict) | 5.x |
| Persistence | Dexie.js (IndexedDB) | 4.4.3 |
| State management | Zustand | 5.0.14 |
| Styling | Tailwind CSS v4 | 4.x |
| UI components | shadcn/ui (copy-paste) | — |
| Search | Fuse.js | 7.4.1 |
| Date utilities | date-fns | 4.x |

---

## Routes (21 total)

```
/                       → redirects to /dashboard
/dashboard              static
/projects               dynamic
/projects/new           static
/projects/[id]          dynamic
/projects/[id]/edit     dynamic
/tasks                  static
/assets                 static
/assets/new             static
/assets/[id]            dynamic
/assets/[id]/edit       dynamic
/decisions              static
/decisions/new          static
/decisions/[id]         dynamic
/decisions/[id]/edit    dynamic
/knowledge              static
/knowledge/new          static
/knowledge/[id]         dynamic
/knowledge/[id]/edit    dynamic
/settings               static
/_not-found             static
```

---

## Seed Data

`data/seed.ts` contains a real 23-project portfolio (post-cleanup from v0.3.0 analysis):
- 3 active projects
- 2 scoped projects
- 3 blocked projects (all with concrete next actions)
- 11 idea projects (medium+ priority)
- 4 low-priority idea projects
- 2 completed projects (maintenance)
- 4 archived projects (merged/superseded)

Import via Settings → Import (after clearing existing data if needed).

---

## Known Limitations

### Data model
- **No `blocked_since` field.** The days-blocked counter on the dashboard uses `updated_at` as a proxy. Editing a blocked project resets the counter. A future `blocked_since` timestamp would fix this.
- **No project-to-project relationships.** Conceptual clusters (India operations, travel, expense) exist in descriptions but are not formally linked. Tags or a relationship field would enable cluster views.
- **No task due dates.** Tasks have status and priority but no date constraints.
- **No recurring tasks.** Each task is a one-off item.

### Search
- **Tasks link to list, not detail.** Clicking a task in search results navigates to `/tasks` (the full list), not directly to the task. There is no individual task detail page.
- **No keyboard navigation in palette.** Arrow keys do not move focus through results. Mouse click required.
- **Status/priority not searchable.** Searching "blocked" or "high priority" returns nothing — these are filtered via the list page filter bar, not search.
- **No search history.** The palette shows quick navigation shortcuts when empty, not recent searches.

### Dashboard
- **No staleness signal.** Active projects with no recent progress look identical to recently updated ones. No "last updated X days ago" indicator.
- **`scoped` status requires manual promotion.** Projects do not automatically advance from idea to scoped — it requires an explicit status change in the project detail.

### UI
- **No dark mode.** Design tokens are defined for light mode only. Dark mode classes exist in some components but are not fully supported.
- **No mobile keyboard handling.** Forms are functional on mobile but not optimized for on-screen keyboards.
- **No drag-and-drop reordering.** Project, task, and other lists are sorted by predefined criteria only.

### Import/Export
- **No CSV import.** Import accepts only the platform's own JSON export format.
- **Import appends, does not merge.** Re-importing the seed data after existing data is present creates duplicates. Clear data first.

---

## Build Verification

```bash
cd platform
npm install
npx tsc --noEmit      # must produce no output (0 errors)
npx next build        # must show all 21 routes with no errors
npm run dev           # development server at http://localhost:3000
```

Expected `npx next build` output summary:
```
✓ Compiled successfully
✓ Generating static pages (15/15)
21 routes rendered
```

---

## Commit History

```
9537b53  chore: add LOVABLE_START_HERE.md for Lovable UI handoff
170e7dc  chore: apply portfolio cleanup to seed data
bc2db2f  feat: complete MVP phases 3-6 + UI foundation + P1 UX polish
46ac550  Phase 2: Project enrichment
08a8f13  Phase 1C: Portfolio dashboard optimization
d87e6ba  Initial commit from Create Next App
```
