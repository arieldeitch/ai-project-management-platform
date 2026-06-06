# Projects Screen UI Changelog
**Date:** 2026-06-06  
**File modified:** `features/projects/components/ProjectsListPage.tsx`  
**Validation:** `npx tsc --noEmit` → 0 errors | `npx next build` → 21 routes clean

---

## Summary

Replaced flat table-style `ProjectRow` with execution-oriented `ProjectCard`. Applied status-coded left border treatment. Promoted Next Action and Blocked Reason to first-class visual elements. Split filter bar into primary (status) and secondary (domain + sort) rows.

---

## Component: `ProjectRow` → `ProjectCard`

### Structure change

**Before** — horizontal row:
```
[name][domain badge] .............. [Priority][Status][updated][→]
[→ next_action or blocked_reason in text-xs muted]
```

**After** — vertical card:
```
┌── [4px left border, color-coded by status] ──────────────────┐
│  Project Name (15px semibold)                                 │
│  → Next Action (13px font-medium, foreground/75)             │
│  ⚠ Blocked Reason (13px font-medium text-red-700)            │
│  [Priority][Status]              [Domain] [updated ago]       │
└───────────────────────────────────────────────────────────────┘
```

### Left border treatment (new)

| Status | Border | Background |
|---|---|---|
| `active` | `border-l-4 border-l-emerald-500` | `bg-emerald-50/20` |
| `blocked` | `border-l-4 border-l-red-500` | `bg-red-50/40` |
| `scoped` | `border-l-4 border-l-sky-400` | `bg-sky-50/10` |
| `idea` | `border-border` (1px, normal) | none |
| `completed` | `border-border` | none + `opacity-55` |
| `deferred` | `border-border` | none + `opacity-55` |
| `archived` | `border-border` | none + `opacity-55` |

### Project name

| Before | After |
|---|---|
| `text-sm font-medium text-foreground` (14px) | `text-[15px] font-semibold text-foreground` |
| No status-based treatment | `text-[14px] text-muted-foreground` for completed/deferred/archived |
| `group-hover:text-primary` | `group-hover:text-primary` (preserved) |

### Next action

| Before | After |
|---|---|
| `text-xs text-muted-foreground` (12px, muted) | `text-[13px] font-medium text-foreground/75` |
| `→` in plain text | `→` in `text-[11px] font-bold text-primary` |
| `line-clamp-1` (single line) | `line-clamp-2` (wraps if needed) |

### Blocked reason

| Before | After |
|---|---|
| `text-xs text-red-600/80` (12px, 80% opacity) | `text-[13px] font-medium text-red-700` (full opacity) |
| `AlertTriangle h-3 w-3` | `AlertTriangle h-3.5 w-3.5` |
| Appeared in same position as next_action | Appears in same position as next_action (blocked takes priority) |

### Metadata footer (new layout)

| Before | After |
|---|---|
| Right-aligned trailing cluster | Two-column footer: badges left, domain+time right |
| Priority + Status + domain + time all same row, right-aligned | Priority + Status on left; Domain + updated on right |
| Priority shown even when `unset` | Priority hidden when `unset` (cleaner) |
| `PriorityBadge` before `StatusBadge` | `PriorityBadge` before `StatusBadge` (same order) |

---

## Filter Bar: Split into Two Rows

### Before — one row:
```
[Status tabs ─────────────────────────] | [All][Personal][Work][General] | [↕][status][priority][updated]
```

### After — two rows:

**Row 1 (primary):** Status tabs only
```
[All 23][Active 3][Blocked 3][Scoped 2][Idea 11]...
```

**Row 2 (secondary):** Domain + Sort with section labels
```
DOMAIN [All][Personal][Work][General]    SORT [status][priority][updated]
```

### Specific changes:
- Status tabs moved from `px-6` → `px-4` (marginal)
- Domain and sort extracted to separate `<div>` row below status tabs
- Added `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` labels "Domain" and "Sort"
- Domain + sort buttons now use `py-0.5` (tighter than previous `py-1`)
- `border-l` separators between domain/sort groups removed (now they're in separate labeled sections)
- `ArrowUpDown` icon removed (redundant with "Sort" label)

---

## List Container

| Before | After |
|---|---|
| `<div>` (no padding, no gap) | `<div className="space-y-2 p-4">` |
| Cards touch each other (border-b separator) | Cards float with 8px gaps on all sides |

---

## Removed Imports

- `ChevronRight` — removed (no longer needed; cards have no row-end arrow)
- `ArrowUpDown` — removed (replaced by "Sort" text label)

---

## Preserved (Unchanged)

- All filter logic (`statusCount`, `domainCount`, `sortProjects`)
- All state (`statusFilter`, `domainFilter`, `sort`)
- `initialStatus` and `initialDomain` props
- `EmptyState` rendering and conditions
- Loading state
- `useProjectsStore` usage
- Navigation (`Link href={/projects/${project.id}}`)
- All badge components (`StatusBadge`, `PriorityBadge`, `DomainBadge`)
- `STATUS_FILTER_OPTIONS` array
- `DOMAIN_FILTER_OPTIONS` array
- `SortMode` type
- `formatDistanceToNow` usage
