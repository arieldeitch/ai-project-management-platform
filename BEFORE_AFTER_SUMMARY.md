# Before / After Visual Summary
**Date:** 2026-06-06  
**Source:** Helm Lovable prototype → Platform implementation

---

## Shell (Sidebar + TopBar)

### Before
```
┌──────────────────────────────────────────────────────────────┐
│ ██ PM Platform                    [Search ⌘K]  [New Project] │  ← h-14 (56px), px-6
├────────────┬─────────────────────────────────────────────────┤
│ Dashboard  │                                                  │
│ Projects   │                                                  │
│ Tasks      │                                                  │  ← w-[220px], px-3 py-2
│ AI Assets  │                                                  │     h-4 w-4 icons
│ Decisions  │                                                  │     active: bg-primary/10
│ Knowledge  │                                                  │
│────────────│                                                  │  ← h-14 header
│ Settings   │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

### After
```
┌──────────────────────────────────────────────────────────────┐
│ ✦ PM Platform                     [Search ⌘K]  [New Project] │  ← h-12 (48px), px-5
├────────────┬─────────────────────────────────────────────────┤
│ Dashboard  │                                                  │
│ Projects   │                                                  │
│ Tasks      │                                                  │  ← w-60 (240px), px-2 py-1.5
│ AI Assets  │                                                  │     h-3.5 w-3.5 opacity-80 icons
│ Decisions  │                                                  │     active: bg-sidebar-accent
│ Knowledge  │                                                  │
│────────────│                                                  │  ← h-12 header (Sparkles logo)
│ Settings   │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

**Key changes:** 8px shorter shell, 20px wider sidebar, smaller dimmed icons, neutral active highlight, Sparkles logo, `/` breadcrumb separators

---

## Dashboard Stat Cards

### Before
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ TOTAL           │  │ ACTIVE          │  │ BLOCKED         │  │ COMPLETED       │
│                 │  │                 │  │                 │  │                 │
│ 23              │  │ 3               │  │ 3               │  │ 2               │
│ (bold 2xl)      │  │ (emerald bold)  │  │ (red bold)      │  │ (violet bold)   │
│ bg-card + shadow│  │ bg-card + shadow│  │ bg-card + shadow│  │ bg-card + shadow│
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### After
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ TOTAL           │  │ ACTIVE          │  │ BLOCKED         │  │ COMPLETED       │
│                 │  │                 │  │                 │  │                 │
│ 23              │  │ 3               │  │ 3               │  │ 2               │
│ (semibold 24px  │  │ (emerald)       │  │ (red)           │  │ (violet)        │
│  font-display)  │  │                 │  │                 │  │                 │
│ bg-surface      │  │ bg-surface      │  │ bg-surface      │  │ bg-surface      │
│ border only     │  │ border only     │  │ border only     │  │ border only     │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Key changes:** `bg-card` → `bg-surface`, shadows removed (flatter), `font-bold text-2xl` → `font-semibold text-[24px] font-display`, labels `text-xs` → `text-[11px]`

---

## Breadcrumb Separators (Detail Pages)

### Before
```
Projects  >  Task Management Platform
           ^── ChevronRight icon (3.5×3.5, opacity 60%)
```

### After
```
Projects  /  Task Management Platform
           ^── slash character (text-muted-foreground/50, select-none)
```

**Effect:** More editorial, path-notation style separator. Consistent with Lovable Helm prototype.

---

## Token System Expansion

### Before (surface hierarchy)
```
--background    oklch(0.975 0.004 264)  ← page background
--card          oklch(1 0 0)            ← white card
[gap]                                   ← nothing between
```

### After (surface hierarchy)
```
--background    oklch(0.975 0.004 264)  ← page background
--surface       oklch(0.992 0.002 264)  ← interactive surfaces, stat cards  ← NEW
--card          oklch(1 0 0)            ← white card (detail panels, forms)
```

### New semantic colors added
```
--success       oklch(0.55 0.15 145)   ← emerald green (On track, positive)
--warning       oklch(0.72 0.16 65)    ← amber (At risk, caution)
--primary-soft  oklch(0.94 0.03 264)   ← soft indigo tint
```

These tokens are now available as Tailwind utilities: `bg-surface`, `text-success`, `bg-success/10`, `text-warning`, `bg-warning/15`, `bg-primary-soft`, etc.

---

## What Didn't Change (Scope Maintained)

| Area | Status |
|---|---|
| Business logic | Unchanged |
| Data model (entities) | Unchanged |
| Zustand stores | Unchanged |
| Dexie / IndexedDB | Unchanged |
| Search (Fuse.js) | Unchanged |
| Routing (21 routes) | Unchanged |
| List pages (Projects, Tasks, Assets, etc.) | Unchanged |
| Form pages | Unchanged |
| FocusCard, BlockedRow, ProjectRow | Unchanged |
| Command palette | Unchanged |
| StatusBadge, PriorityBadge | Unchanged |
| Settings page | Unchanged |

---

## Validation Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✓ 0 errors (silent output) |
| `npx next build` | ✓ 21 routes, 0 warnings |
| Route count | ✓ 21 (unchanged) |
