# UI Pass #4 — Portfolio Command Center Plan
**Date:** 2026-06-06
**Files modified:**
1. `app/globals.css`
2. `components/layout/Sidebar.tsx`
3. `features/projects/components/ProjectsListPage.tsx`

---

## 1. Font — Wire Geist to font-sans

**Problem:** `globals.css` sets `--font-sans: var(--font-sans)` in `@theme` (maps the Tailwind
token to a CSS variable) but never assigns `--font-sans` in `:root`. `layout.tsx` loads Geist
as `--font-geist-sans` but the bridge is missing. Result: `font-sans` uses the browser/system
default, not Geist.

**Fix:** Add one line to `:root`:
```css
--font-sans: var(--font-geist-sans);
```

No layout.tsx changes needed — Geist is already loaded. One line closes the gap.

---

## 2. Remove Nested Vertical Scrolling

**Problem:** Board container has `overflow-y-hidden` and each column has `overflow-y-auto`.
This creates N independent scroll containers — one per column — which is disorienting.

**Fix:** Single scroll container on the board itself.

Before:
```
Board:  flex-1  overflow-x-auto  overflow-y-hidden
Column body:  overflow-y-auto  ← nested scroll
```

After:
```
Board:  flex-1  overflow-auto            ← single scroll (X and Y)
Column body:  no overflow constraint     ← column grows to show all cards
```

The board div becomes the only scroll container. Columns expand to show all their tickets.
Horizontal scroll still works (minWidth: max-content preserved). Vertical scroll moves the
whole board as one unit instead of N independent column scroll areas.

---

## 3. Priority Card Tinting

Replace `PRIORITY_BORDER` (left border only) with `PRIORITY_CARD` (card background tint +
border + left accent). Priority is now communicated by the card's overall color, not just
a border line.

| Priority | Card bg | Border | Left accent |
|---|---|---|---|
| `critical` | `bg-red-50` | `border-red-200` | `border-l-[3px] border-l-red-500` |
| `high` | `bg-orange-50/50` | `border-orange-200` | `border-l-[3px] border-l-orange-400` |
| `medium` | `bg-card` | `border-border` | none |
| `low` | `bg-card` | `border-border` | none (+ `opacity-70`) |
| `unset` | `bg-card` | `border-border` | none |

Blocked card tinting takes precedence over priority tinting (already red).
Dimmed status (completed/deferred/archived) takes precedence — opacity-60 wins.

---

## 4. Workload Indicators

A thin colored bar below each column header shows relative card density across the board.
Width is proportional: `(count / maxCount) * 100%`.

Added to `ColumnConfig`:
```tsx
barColor: string  // e.g. 'bg-emerald-400'
```

Bar renders as a 2px strip between the header and the first card. Empty columns (collapsed)
don't show a bar.

---

## 5. Sidebar — Portfolio Command Center

**Structural change:** Nav loses `flex-1`. Command Center section gets `flex-1 min-h-0
overflow-y-auto` so it fills remaining sidebar space and scrolls if needed.

```
┌─ Brand (h-12, fixed) ─────────────────┐
│                                        │
├─ Nav (shrink-0) ──────────────────────┤
│  Dashboard                             │
│  Projects                              │
│  Tasks                                 │
│  AI Assets                             │
│  Decisions                             │
│  Knowledge                             │
│                                        │
├─ Portfolio Command Center (flex-1) ───┤
│                                        │
│  PORTFOLIO                             │
│  23 total  3 active  3 blocked         │
│                                        │
│  HIGH PRIORITY                         │
│  India Returns App                     │
│    → Deploy prod build                 │
│  Task Mgmt Platform                    │
│    → Import seed data                  │
│                                        │
│  ⚠ BLOCKED                            │
│  Noris Dashboard                       │
│    Waiting on stakeholder sign-off      │
│                                        │
│  NEXT ACTIONS                          │
│  Deploy prod build                     │
│    India Returns App                   │
│  Review PR #47                         │
│    Noris Backend                       │
│                                        │
├─ Settings (shrink-0) ─────────────────┤
└───────────────────────────────────────┘
```

**Data derivation (computed from store, not new queries):**

```tsx
const { projects, load } = useProjectsStore()
// Hot: critical or high priority, active or scoped
const hotProjects = projects
  .filter(p => (p.priority === 'critical' || p.priority === 'high')
    && (p.status === 'active' || p.status === 'scoped'))
  .slice(0, 4)

// Blocked
const blockedProjects = projects
  .filter(p => p.status === 'blocked')
  .slice(0, 4)

// Next actions: active projects with next_action set, sorted by priority
const PRIORITY_ORD = ['critical', 'high', 'medium', 'low', 'unset'] as const
const nextActionItems = projects
  .filter(p => p.next_action && (p.status === 'active' || p.status === 'scoped'))
  .sort((a, b) => PRIORITY_ORD.indexOf(a.priority) - PRIORITY_ORD.indexOf(b.priority))
  .slice(0, 4)
```

**No new imports beyond store + types already used elsewhere.**

Command center renders `{projects.length > 0 && ...}` — hidden until data loads.

---

## 6. Density and Typography

Ticket improvements:
- Padding: `p-2` → `p-2.5` (more breathing room)
- Action line font-weight: `font-semibold` → `font-medium` (less heavy, better rhythm)
- Column body gap: `space-y-1.5` → `space-y-2`
- Column body padding: `p-2` → `p-2.5`

Column header: `py-2` → `py-2.5` (slightly taller)

KPI strip: `py-1.5` → `py-2`, number size `text-[18px]` → `text-[20px]`

---

## Constraints

- No store / repository / type / routing / Dexie changes
- `initialStatus` / `initialDomain` props preserved
- TypeScript strict: 0 errors
- 3 files changed, no new files (except plan + changelog)
- All existing functionality preserved
