# Portfolio Control Tower — Changelog
**Date:** 2026-06-06
**File modified:** `features/projects/components/ProjectsListPage.tsx`
**Validation:** `npx tsc --noEmit` → 0 errors | `npx next build` → 21 routes clean

---

## A. Priority hierarchy — ticket left border accent

Replaced `PriorityBadge` in the ticket footer with a colored left-border accent that
communicates priority at scan speed, before the name is even read.

| Priority | Border |
|---|---|
| `critical` | 3px red-500 |
| `high` | 3px orange-400 |
| `medium` | 3px indigo-400 |
| `low` | 3px zinc-300 |
| `unset` | none |

`PriorityBadge` import removed — DomainBadge and timestamp are the only footer elements now.
Blocked tickets: priority border suppressed; red blocked treatment takes precedence.

---

## B. Active column — visual emphasis

| Property | Before | After |
|---|---|---|
| Width | `w-[220px]` | `w-[240px]` |
| Outer border | `border-border` | `border-emerald-200` |
| Header bg | `bg-emerald-50` | `bg-emerald-100` |
| Shadow | none | `shadow-sm` |

Note: CSS sticky positioning within a `min-width: max-content` flex scroll container requires
a pixel-precise `left` value that changes dynamically as empty columns collapse. Sticky
skipped — visual emphasis makes the column distinguishable without pinning.

---

## C. Blocked column — warning treatment

| Element | Before | After |
|---|---|---|
| Header bg | `bg-red-50` | `bg-red-100` |
| Header icon | `bg-red-500` dot | `AlertTriangle h-3 w-3 text-red-600` |
| Count | plain dim number | filled red badge (`bg-red-500 text-white rounded-full`) |

---

## D. Portfolio KPI strip

Added `PortfolioKPI` component rendered between the filter bar and the board.
Shows 5 metrics that reflect the current domain filter (not the global total):

```
23 Total  |  3 Active  |  3 Blocked  |  2 Scoped  |  6 Completed
```

- Number style: `font-display text-[18px] font-semibold tabular-nums`
- Label style: `text-[10px] uppercase tracking-wider text-muted-foreground`
- Color accents: Total=foreground, Active=emerald, Blocked=red, Scoped=sky, Completed=violet
- Dividers: `border-l border-border` between each item
- Hidden when `projects.length === 0` (no KPI strip in empty state)

---

## E. Ticket density — reduced height

Target: 5–8 tickets visible per column without scrolling. Estimated: ~7 at a 490px column.

| Element | Before | After |
|---|---|---|
| Padding | `p-2.5` (10px all sides) | `p-2` (8px all sides) |
| Name | `line-clamp-2` | `line-clamp-1` |
| Action top margin | `mt-1` | `mt-0.5` |
| Footer top margin | `mt-1.5` | `mt-1` |

---

## F. Next action as primary text line

Inverted the visual hierarchy: next action promoted, name demoted to label.

| Element | Before | After |
|---|---|---|
| Name | `text-[12px] font-semibold text-foreground` | `text-[11px] font-medium text-muted-foreground` |
| Next action | `text-[11px] text-muted-foreground` | `text-[12px] font-semibold text-foreground` |
| Blocked reason | `text-[11px] font-medium text-red-600` | `text-[12px] font-semibold text-red-600` |

Project name remains the structural title (top position). Next action is the primary readable
content. Domain badge + timestamp are the only metadata.

---

## G. Empty column collapse

Columns with zero projects now render as a 36px-wide labeled strip instead of consuming
full column width. Saves ~184px per empty column — significant on smaller screens.

```
w-[36px]  →  [● dot]
              [Idea]  ← rotated label (writing-mode: vertical-lr)
```

Non-empty columns render at their normal width (`w-[220px]` or `w-[240px]` for Active).

---

## Removed

- `PriorityBadge` import and usage — priority now communicated via left border
- `emptyText` field from `ColumnConfig` — empty columns show a collapsed strip, not placeholder text
