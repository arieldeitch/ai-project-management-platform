# UI Pass #4 — Portfolio Command Center Changelog
**Date:** 2026-06-06
**Files modified:** 3
**Validation:** `npx tsc --noEmit` → 0 errors | `npx next build` → 21 routes clean

---

## 1. Font — Geist wired globally (`app/globals.css`)

**Before:** `--font-sans` token mapped to itself (circular reference). App rendered in
system/browser default font despite Geist being loaded in `layout.tsx`.

**Fix:** Added to `:root`:
```css
--font-sans: var(--font-geist-sans);
```

`layout.tsx` loads `Geist` as `--font-geist-sans`. This one line bridges the gap. Geist
Sans is now the global font for all text (body, headings, labels). Geist Mono remains on
`--font-mono` for code/tabular elements.

---

## 2. Removed nested vertical scrolling (`ProjectsListPage.tsx`)

**Before:** Board had `overflow-x-auto overflow-y-hidden`. Each column body had
`overflow-y-auto`, creating N independent vertical scroll areas — one per column.

**After:** Single scroll container. Board container: `overflow-auto`. Column bodies: no
overflow constraint — columns grow to show all tickets. Page scrolls as one unit both
horizontally and vertically.

```
Before:
  Board: overflow-x-auto  overflow-y-hidden
    Column A:  overflow-y-auto  ← independent scroll
    Column B:  overflow-y-auto  ← independent scroll
    ...

After:
  Board: overflow-auto  ← single scroll container
    Column A:  grows naturally to content height
    Column B:  grows naturally to content height
    ...
```

`minHeight: '100%'` on the inner board div ensures columns fill viewport height even when
content is sparse.

---

## 3. Priority card tinting (`ProjectsListPage.tsx`)

Replaced left-border-only priority signal with full card tinting. Priority is now
communicated by the card's background color, border color, and left accent.

| Priority | Card background | Border | Left accent |
|---|---|---|---|
| `critical` | `bg-red-50` | `border-red-200` | 3px red-500 |
| `high` | `bg-orange-50/50` | `border-orange-200` | 3px orange-400 |
| `medium` | `bg-card` | `border-border` | none |
| `low` | `bg-card` + `opacity-70` | `border-border` | none |
| `unset` | `bg-card` | `border-border` | none |

Precedence order:
1. `blocked` → red tint (overrides priority)
2. `dimmed` (completed/deferred/archived) → neutral card + opacity-60
3. priority tinting applied

---

## 4. Workload indicators (`ProjectsListPage.tsx`)

A 2px proportional bar renders between the column header and the first card. Width is
`(columnCount / maxColumnCount) * 100%`. The column with the most projects shows a full-width
bar; all other columns show a proportional fraction. Animates with `transition-all duration-300`.

Added `barColor` field to `ColumnConfig`:

| Column | Bar color |
|---|---|
| Idea | `bg-zinc-400` |
| Scoped | `bg-sky-400` |
| Active | `bg-emerald-500` |
| Blocked | `bg-red-500` |
| Completed | `bg-violet-400` |
| Deferred | `bg-amber-400` |
| Archived | `bg-zinc-300` |

Empty columns (collapsed to 36px strip) don't render a bar.

---

## 5. Sidebar — Portfolio Command Center (`Sidebar.tsx`)

Added three live data sections below navigation. Data is derived from `useProjectsStore`
(same store used by ProjectsListPage — no new queries or data fetching).

```
┌─ Brand ───────────────────────────────┐
├─ Navigation (shrink-0) ───────────────┤
│  Dashboard / Projects / Tasks / ...   │
├─ Portfolio Command Center (flex-1) ───┤
│                                       │
│  PORTFOLIO                            │
│  23 total  3 active  3 blocked        │
│                                       │
│  HIGH PRIORITY                        │
│  India Returns App                    │
│    → Deploy prod build                │
│  Task Mgmt Platform                   │
│    → Import seed data                 │
│                                       │
│  ⚠ BLOCKED                           │
│  Noris Dashboard                      │
│    Waiting on stakeholder sign-off    │
│                                       │
│  NEXT ACTIONS                         │
│  Deploy prod build                    │
│    India Returns App                  │
│                                       │
├─ Settings (shrink-0) ─────────────────┤
└───────────────────────────────────────┘
```

**Sections:**

- **Portfolio:** total / active count / blocked count, color-coded
- **High Priority:** up to 4 projects with `priority === 'critical' | 'high'` AND
  `status === 'active' | 'scoped'`, with next action below name
- **Blocked:** up to 4 blocked projects with blocked reason
- **Next Actions:** up to 4 active/scoped projects with `next_action` set, sorted by
  priority, showing action text first and project name second

**Structure change:** Nav section loses `flex-1`. Command Center gets `flex-1 min-h-0
overflow-y-auto`. Settings panel pinned with `shrink-0`. Command center scrolls independently
if content exceeds sidebar height.

Command center hidden until `projects.length > 0` — no flash of partial content.

---

## 6. Typography and density (`ProjectsListPage.tsx`)

| Element | Before | After |
|---|---|---|
| Ticket padding | `p-2` (8px) | `p-2.5` (10px) |
| Ticket action weight | `font-semibold` | `font-medium` |
| Ticket footer gap | `mt-1` | `mt-1.5` |
| Column body gap | `space-y-1.5` | `gap-2` |
| Column body padding | `p-2` (8px) | `p-2.5` (10px) |
| Column header padding | `py-2` | `py-2.5` |
| KPI strip number | `text-[18px]` | `text-[20px]` |
| KPI strip padding | `py-1.5` | `py-2` |
