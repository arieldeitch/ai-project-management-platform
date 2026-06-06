# Projects Kanban Board — Redesign Plan
**Date:** 2026-06-06  
**File:** `features/projects/components/ProjectsListPage.tsx` (only file modified)

---

## Goals

- Replace vertical card list with horizontal Kanban columns
- Show entire portfolio on one screen without vertical scrolling
- Make project lifecycle (Idea → Scoped → Active → Blocked → Completed → Archived) the primary visual structure
- Maximize information density with compact ticket cards

---

## Constraints

- No store, repository, type, routing, or Dexie changes
- Props (`initialStatus`, `initialDomain`) preserved for call-site compatibility
- All filter/sort logic preserved (domain filter + sort mode still work)
- Clicking a ticket navigates to existing detail page
- TypeScript strict: 0 errors

---

## Column Configuration

7 columns representing the full project lifecycle:

| Column | Status | Color accent | Lifecycle stage |
|---|---|---|---|
| Idea | `idea` | Zinc | Entry point |
| Scoped | `scoped` | Sky | Ready to start |
| Active | `active` | Emerald | In progress |
| Blocked | `blocked` | Red | Stopped |
| Completed | `completed` | Violet | Done |
| Deferred | `deferred` | Amber | Parked |
| Archived | `archived` | Zinc (dimmed) | Closed |

Note: `deferred` is included (it is a valid status in the data model) even though the requirements list 6 columns. Hiding it would silently omit valid projects from the board.

---

## Layout

```
[TopBar h-12 — "Projects" + New Project]
[Filter bar — DOMAIN [All][Personal][Work][General]   SORT [priority][updated]]
[Board — flex-1, overflow-x-auto, overflow-y-hidden]
  └── [flex h-full gap-3 p-4 min-w-max]
        ├── KanbanColumn (idea)      w-[220px] flex-col
        ├── KanbanColumn (scoped)    w-[220px] flex-col
        ├── KanbanColumn (active)    w-[220px] flex-col
        ├── KanbanColumn (blocked)   w-[220px] flex-col
        ├── KanbanColumn (completed) w-[220px] flex-col
        ├── KanbanColumn (deferred)  w-[220px] flex-col
        └── KanbanColumn (archived)  w-[220px] flex-col
```

Total minimum board width: 7 × 220px + 6 × 12px (gap-3) = 1612px  
Content area on 1440px screen (240px sidebar): ~1200px → board scrolls horizontally. Expected behavior.

Each column:
- Fixed width `w-[220px]`, never shrinks (`shrink-0`)
- Header: colored, shows status name + count
- Body: `flex-1 overflow-y-auto` — scrolls vertically within the column
- Rounded with border

---

## KanbanTicket Card (compact)

Replaces `ProjectCard`. Target height: ~72–80px per ticket.

```
┌── [card] ────────────────────────┐
│  Project Name (12px semibold,    │
│  up to 2 lines)                  │
│  → next action (11px, 1 line)    │
│  ⚠ blocked reason (11px, 1 line) │
│  [Priority] [Domain]   [2d ago]  │
└──────────────────────────────────┘
```

- Name: `text-[12px] font-semibold line-clamp-2` 
- Next action: `text-[11px] text-muted-foreground line-clamp-1`
- Blocked reason: `text-[11px] font-medium text-red-600 line-clamp-1` + `AlertTriangle h-3 w-3`
- Priority badge: `px-1.5 py-0 text-[10px]` (compact override via `cn()`)
- Domain badge: `px-1.5 py-0 text-[10px]` (compact override via `cn()`)
- Updated: `text-[10px] text-muted-foreground tabular-nums`
- **No StatusBadge** — redundant; column communicates status

Blocked column tickets get `border-red-200 bg-red-50/50` treatment.

---

## Column Header

```
┌── [colored header band] ─────────────┐
│  ● Active                          3  │
└───────────────────────────────────────┘
```

- Status dot (`h-2 w-2 rounded-full`) in status color
- Label: `text-[12px] font-semibold`
- Count: `text-[11px] font-mono tabular-nums` right-aligned
- Background: subtle status-tinted header (e.g. `bg-emerald-50` for active)

---

## Filter Bar Changes

**Removed**: Status filter tabs (columns replace them)  
**Kept**: Domain filter + Sort

New filter bar: single row with labeled sections.

```
DOMAIN [All][Personal][Work][General]    SORT [priority][updated]
```

Note: "status" sort mode is removed from the board — sorting by status within a column where all items have the same status is meaningless. Sort options become `priority` and `updated` only.

---

## State Changes

| State | Before | After |
|---|---|---|
| `statusFilter` | Used for list filtering | **Removed** (columns handle it) |
| `domainFilter` | Used for domain filtering | Preserved |
| `sort` | `'status' \| 'priority' \| 'updated'` | `'priority' \| 'updated'` (status removed) |

`SortMode` type narrows from 3 to 2 options. This is a safe TypeScript change within the file.

`initialStatus` prop accepted but not used (board shows all statuses). Kept for call-site compatibility.

---

## New Component Tree

```
ProjectsListPage
├── TopBar
├── FilterBar (domain + sort)
└── Board (overflow-x-auto)
    └── KanbanColumn × 7
        ├── ColumnHeader (label + count)
        └── ColumnBody (overflow-y-auto)
            └── KanbanTicket × N
```

---

## TypeScript Safety

- `KANBAN_COLUMNS` typed as `readonly` array with `ProjectStatus`
- `KanbanTicket` receives `project: Project` (unchanged type)
- `KanbanColumn` receives `projects: Project[]`, `sort: SortMode`, `config: ColumnConfig` (inlined interface)
- No `any`, no `@ts-ignore`
- `cn()` used for all conditional classes — `tailwind-merge` handles conflicts correctly
- Badge `className` overrides work via `twMerge` (confirmed: `cn` uses `tailwind-merge`)

---

## Empty Column State

Each empty column shows a minimal placeholder:
```
(no tickets)
Empty text centered, text-[11px] text-muted-foreground
```

No EmptyState component needed — columns with 0 items simply show the placeholder text.

---

## What Is Not Changed

- `useProjectsStore` — unchanged
- `sortProjects` function — unchanged (reused for within-column sort)
- `DOMAIN_FILTER_OPTIONS` — unchanged
- `formatDistanceToNow` — unchanged
- Link routing — unchanged  
- `StatusBadge`, `PriorityBadge`, `DomainBadge` — imported but badge overrides applied via className
- `EmptyState` import — retained for the zero-projects empty state (when all projects are filtered out by domain)
