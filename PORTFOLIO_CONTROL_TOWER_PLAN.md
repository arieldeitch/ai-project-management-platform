# Portfolio Control Tower — Plan
**Date:** 2026-06-06
**File modified:** `features/projects/components/ProjectsListPage.tsx` (only)

---

## Changes

### A. Priority hierarchy — ticket left border accent

Replace badge-only priority signal with a colored left border on each ticket.

| Priority | Border |
|---|---|
| `critical` | `border-l-[3px] border-l-red-500` |
| `high` | `border-l-[3px] border-l-orange-400` |
| `medium` | `border-l-[3px] border-l-indigo-400` |
| `low` | `border-l-[3px] border-l-zinc-300` |
| `unset` | none |

PriorityBadge removed from ticket footer — border is the primary priority signal.
Blocked tickets: priority border suppressed (blocked red border takes precedence).

---

### B. Active column — visual emphasis

Active column gets stronger visual treatment to stand out as the primary work lane.

| Property | Before | After |
|---|---|---|
| Width | `w-[220px]` | `w-[240px]` |
| Border | `border-border` | `border-emerald-200` |
| Header bg | `bg-emerald-50` | `bg-emerald-100` |
| Shadow | none | `shadow-sm` |

Note: CSS `position: sticky` within a `min-width: max-content` flex container requires a
precise pixel offset that changes dynamically when empty columns collapse. Skipped in favor
of visual emphasis — the column is distinguishable by weight, not pinned position.

---

### C. Blocked column — warning treatment

| Property | Before | After |
|---|---|---|
| Header bg | `bg-red-50` | `bg-red-100` |
| Header icon | dot `bg-red-500` | `AlertTriangle h-3 w-3 text-red-600` |
| Count | plain number | red filled badge (`bg-red-500 text-white rounded-full`) |

---

### D. Portfolio KPI row

Compact strip rendered between filter bar and board.
Reflects `visible` projects (respects domain filter).

```
23 Total  |  3 Active  |  3 Blocked  |  2 Scoped  |  6 Completed
```

- Number: `font-display text-[18px] font-semibold tabular-nums`
- Label: `text-[10px] uppercase tracking-wider text-muted-foreground`
- Dividers: `border-l border-border` between items

---

### E. Ticket density — reduce height

Target: 5–8 tickets visible per column without column-level scrolling.

| Element | Before | After |
|---|---|---|
| Padding | `p-2.5` (10px) | `p-2` (8px) |
| Name | `text-[12px] line-clamp-2` | `text-[11px] line-clamp-1` |
| Action gap | `mt-1` | `mt-0.5` |
| Footer gap | `mt-1.5` | `mt-1` |

Estimated height per ticket: ~64px. With `space-y-1.5` (6px gap): ~70px.
7 tickets at 70px = 490px — fits a standard column height. ✓

---

### F. Next action as primary line

| Element | Before | After |
|---|---|---|
| Name | `text-[12px] font-semibold text-foreground` | `text-[11px] font-medium text-muted-foreground` (title/label) |
| Next action | `text-[11px] text-muted-foreground` | `text-[12px] font-semibold text-foreground` (PRIMARY) |
| Blocked reason | `text-[11px] font-medium text-red-600` | `text-[12px] font-semibold text-red-600` (matches action weight) |

Name stays at top (structural title). Next action is the primary readable line.

---

### G. Empty column collapse

Columns with zero projects collapse to a 36px-wide strip showing a colored dot + rotated label.
Full-width columns (220px/240px) only render when they have ≥1 project.

```tsx
// Empty → narrow strip
<div className="w-[36px] ...">
  <dot /> <label style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }} />
</div>

// Non-empty → full column
<div className={isActive ? 'w-[240px]' : 'w-[220px]'}>
  ...
</div>
```

---

## Constraints

- No store, repository, Dexie, routing, or type changes
- `initialStatus` and `initialDomain` props preserved
- TypeScript strict: 0 errors
- Only one file changed

## Deliverables

1. This plan
2. `ProjectsListPage.tsx` implementation
3. `npx tsc --noEmit` → 0 errors
4. `npx next build` → clean
5. `CONTROL_TOWER_CHANGELOG.md`
6. Git commit
