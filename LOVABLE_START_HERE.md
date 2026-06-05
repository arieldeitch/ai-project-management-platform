# Lovable — Start Here

Read this file before touching anything. It is short. It will save you from breaking things.

---

## What This Application Is

A **local-first personal project management platform** for a solo AI practitioner managing 23 projects across personal, work, and general domains. It replaces an Excel spreadsheet. It has no backend, no authentication, no cloud sync. All data lives in the browser's IndexedDB via Dexie.js.

It is a **desktop-first** productivity tool used daily by one person. Mobile support is nice to have. Density and clarity matter more than whitespace and animation.

---

## Current Status

- **Build:** Clean. `npx tsc --noEmit` → 0 errors. `npx next build` → 21 routes, 0 warnings.
- **Features:** Complete. All 6 modules functional (Dashboard, Projects, Tasks, Assets, Decisions, Knowledge, Search, Settings).
- **Data:** 23 real portfolio projects in `data/seed.ts`.
- **UI Foundation:** Complete. Design tokens, card shadows, StatusBadge, PriorityBadge, tab styles, breadcrumbs — all done.

**Your job is visual polish only.** Business logic, data model, and routing are frozen.

---

## Stack — Read Before Writing a Single Line

| Layer | Technology | Critical note |
|---|---|---|
| Framework | Next.js 16.2.7 (App Router) | Not Pages Router. Not Next.js 13/14. |
| Language | TypeScript 5 strict | Zero `any`. Zero `@ts-ignore`. |
| **Styling** | **Tailwind CSS v4** | **No `tailwind.config.js`. Tokens live in `app/globals.css` via `@theme inline {}`. Do not create a config file — it will break the build.** |
| UI components | shadcn/ui (copy-paste) | Not a package. Files live in `components/ui/`. |
| Persistence | Dexie.js 4 (IndexedDB) | No server. No Supabase. No Prisma. |
| State | Zustand 5 | One slice per domain in `store/`. |
| Search | Fuse.js 7 | Client-side fuzzy search, pre-warmed at boot. |

**Tailwind v4 is the most common breaking point.** There is no `tailwind.config.js`. Utility classes are generated from `@theme inline {}` in `app/globals.css`. If you try to add a config file or use v3 patterns like `theme.extend`, you will break the build silently.

---

## Design Tokens

All tokens are in `app/globals.css` under `@theme inline {}`. Do not define colours inline — use the tokens.

```
--background:        oklch(0.975 0.004 264)   warm off-white
--card:              oklch(1 0 0)             pure white
--foreground:        oklch(0.145 0.005 264)
--primary:           oklch(0.50 0.20 264)     indigo
--primary-foreground oklch(0.985 0 0)
--muted:             oklch(0.940 0.004 264)
--muted-foreground:  oklch(0.50 0.008 264)
--border:            oklch(0.885 0.006 264)   warm tinted
--sidebar:           oklch(0.960 0.005 264)
```

Custom utility classes already defined in `globals.css`:
- `.shadow-card` — resting card shadow
- `.shadow-card-hover` — hover card shadow

---

## Repository Structure

```
platform/
├── app/                    Next.js App Router — page wrappers only
│   └── globals.css         ← DESIGN TOKENS LIVE HERE
├── components/
│   ├── layout/             AppShell, Sidebar, TopBar
│   ├── shared/             StatusBadge, PriorityBadge, EmptyState, CommandPalette
│   └── ui/                 shadcn/ui components
├── features/               One folder per domain
│   ├── dashboard/
│   ├── projects/
│   ├── tasks/
│   ├── assets/
│   ├── decisions/
│   ├── knowledge/
│   ├── search/
│   └── settings/
├── store/                  Zustand slices — do not touch
├── data/                   Dexie schema + repositories — do not touch
├── lib/constants/          Status/priority configs with Lucide icons — do not touch
└── types/entities.ts       Entity type definitions — do not touch
```

---

## Files Lovable MAY Modify

These are the safe zones. All visual work happens here.

**Global styles and tokens:**
- `app/globals.css` — adjust token values, add utility classes, tweak spacing

**Layout components:**
- `components/layout/AppShell.tsx` — sidebar layout, content area proportions
- `components/layout/Sidebar.tsx` — navigation links, sidebar width, nav item styling
- `components/layout/TopBar.tsx` — header height, title styling, search button

**Shared visual components:**
- `components/shared/StatusBadge.tsx` — badge appearance (keep pill + dot pattern, keep all 7 statuses)
- `components/shared/PriorityBadge.tsx` — badge appearance (keep pill + dot pattern)
- `components/shared/EmptyState.tsx` — empty state visual design
- `components/shared/CommandPalette.tsx` — palette visual design only (do not change search logic)

**Feature page components (visual only):**
- `features/dashboard/components/DashboardPage.tsx`
- `features/projects/components/ProjectsListPage.tsx`
- `features/projects/components/ProjectDetailPage.tsx`
- `features/projects/components/ProjectForm.tsx`
- `features/tasks/components/TasksListPage.tsx`
- `features/tasks/components/TaskRow.tsx`
- `features/tasks/components/TaskForm.tsx`
- `features/assets/components/AssetsListPage.tsx`
- `features/assets/components/AssetDetailPage.tsx`
- `features/assets/components/AssetForm.tsx`
- `features/decisions/components/DecisionsListPage.tsx`
- `features/decisions/components/DecisionDetailPage.tsx`
- `features/decisions/components/DecisionForm.tsx`
- `features/knowledge/components/KnowledgeListPage.tsx`
- `features/knowledge/components/KnowledgeDetailPage.tsx`
- `features/knowledge/components/KnowledgeForm.tsx`
- `features/settings/components/SettingsPage.tsx`

**shadcn/ui components** (if restyling is needed):
- Any file under `components/ui/` — these are copy-paste components, safe to adjust

---

## Files Lovable Must NOT Modify

Touching these will break functionality. No exceptions.

| File / Directory | Why frozen |
|---|---|
| `store/*.ts` | Zustand state — changing shape breaks all components |
| `data/db/` | Dexie schema — changing breaks IndexedDB persistence |
| `data/repositories/` | Data access layer — changing breaks all CRUD |
| `data/seed.ts` | Real portfolio data — changing corrupts the import |
| `types/entities.ts` | Type definitions — changing causes TypeScript cascade failures |
| `lib/constants/task-statuses.tsx` | Lucide icons + status config used by TaskRow |
| `lib/constants/statuses.ts` | Project status config used by multiple components |
| `lib/constants/priorities.ts` | Priority config used by Dashboard and badges |
| `lib/hooks/useDataLoader.ts` | Search index warm-up at boot — breaking it kills search |
| `app/layout.tsx` | Root layout — modifying can break AppShell mounting |
| `app/*/page.tsx` (all route files) | Route wrappers — do not add or remove routes |
| `next.config.ts` | Build config — do not modify |
| `tsconfig.json` | TypeScript config — do not modify |
| `package.json` | Dependencies — do not add or remove packages without reason |

**One-line rule:** If the file lives in `store/`, `data/`, `types/`, or `lib/`, do not touch it.

---

## Architecture Rules (Hard Constraints)

These are invariants. Do not route around them.

1. **UI components never import from `data/`** — always go through the store
2. **Stores never import from `data/db/`** — always go through repositories
3. **No new routes** — the 21 routes are complete. Do not add pages.
4. **No new entities** — the 6 entity types are complete. Do not add tables.
5. **No tailwind.config.js** — v4 only. Tokens in `globals.css`.
6. **No new package dependencies** without explicit approval — the stack is intentionally minimal
7. **Tab style is underline everywhere** — `border-b-2 border-primary` for active tabs. No solid pills.

---

## What Has Already Been Done (Do Not Redo)

- Warm off-white background + indigo primary color
- Card shadow system (`.shadow-card`, `.shadow-card-hover`)
- StatusBadge: pill + colored dot, 7 statuses, animated pulse for blocked
- PriorityBadge: pill + colored dot
- Underline tab style across all 6 list pages
- Breadcrumb navigation in all 4 detail page TopBars
- Task status icons: Lucide icons (Circle, CircleDot, CheckCircle2, XCircle)
- Row action buttons: visible at rest (opacity-30)
- InlineText fields: dashed underline + pencil icon affordance
- Dashboard: blocked band, FocusCard, domain filter tabs, stat cards

---

## Recommended Redesign Order

Work in this sequence. Each step is self-contained and testable before moving to the next.

### Step 1 — Global shell (lowest risk, highest visual impact)
`AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `globals.css`

Get the frame right first. Sidebar proportions, navigation item styling, header height, background tones. Everything else inherits from this.

**Test:** All 6 section navigations work. TopBar title renders. Search button opens palette.

### Step 2 — List pages (highest daily-use surface)
`ProjectsListPage.tsx`, `TasksListPage.tsx`, `AssetsListPage.tsx`, `DecisionsListPage.tsx`, `KnowledgeListPage.tsx`

These are the screens you spend 80% of your time on. Row density, hover states, badge rendering, empty states.

**Test:** Status filter tabs work. Row click navigates. Row actions (edit/delete) appear on hover.

### Step 3 — Dashboard
`DashboardPage.tsx`

The FocusCard, blocked band, stat cards, domain tabs. This is the most complex page visually.

**Test:** Domain tab filtering works. FocusCard shows correct project. Blocked projects appear in the red band.

### Step 4 — Detail pages
`ProjectDetailPage.tsx`, `AssetDetailPage.tsx`, `DecisionDetailPage.tsx`, `KnowledgeDetailPage.tsx`

Breadcrumb navigation, meta panel layout, section dividers, inline editing affordances.

**Test:** Breadcrumb links navigate correctly. Inline fields in Project Detail are editable. Tabs (Overview/Tasks/Assets/Decisions/Knowledge) switch correctly.

### Step 5 — Forms
`ProjectForm.tsx`, `TaskForm.tsx`, `AssetForm.tsx`, `DecisionForm.tsx`, `KnowledgeForm.tsx`

Field grouping, label styling, input focus states, button placement.

**Test:** Each form submits successfully. Validation errors appear. Cancel returns to previous screen.

### Step 6 — Command palette + Settings
`CommandPalette.tsx`, `SettingsPage.tsx`

Palette overlay, result row styling, quick navigation items. Settings import/export/clear buttons.

**Test:** ⌘K opens palette. Typing returns results. Escape closes. Import/export/clear all function correctly.

---

## Verification Before Merging Back

Run these three commands. All must pass with zero errors and all 21 routes present:

```bash
cd platform
npx tsc --noEmit
npx next build
```

Then run through the functional checklist in `LOVABLE_REVIEW_CHECKLIST.md`.

If either command fails — do not merge. Return to Lovable with the specific error.
