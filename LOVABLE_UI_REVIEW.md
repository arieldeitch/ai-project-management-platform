# Lovable UI Review — Helm / Project Compass UI
**Source:** https://indigo-zen-canvas.lovable.app  
**Reviewed:** 2026-06-06  
**Method:** Full HTML source extraction + CSS summary  

---

## What the Lovable App Shows

### App identity
- Name: **Helm** (not "PM Platform")
- Tagline: "Personal AI project management dashboard"
- Logo: Sparkles icon in a `h-6 w-6 rounded-md bg-primary` container

### Navigation structure
Sidebar at `w-60` (240px) with:
1. Dashboard
2. Projects (count badge)
3. Inbox (count badge) — prototype-only, not in real app
4. AI Assistant — prototype-only
5. Calendar — prototype-only
6. Insights — prototype-only

Section divider: "Projects" label with `+` button, then 5 recent project links with colored dot indicators

Bottom footer: Settings link + user avatar card (name, role, status dot)

### Dashboard layout
- Greeting: date line (11px uppercase) + H1 (`font-display text-[26px]`) + subtitle
- 4-column stat grid (Active, Tasks, Focus hours, On-time %)
- 2/3 + 1/3 split: Today task list + AI Assistant panel
- Portfolio health: full-width 4-column project health grid with progress bars

### Projects screen
Not a separate page in the HTML — inferred from sidebar count badge and nav link.

### Project detail
Not captured in the fetched HTML (prototype may not have implemented it).

---

## Design System Delta — Lovable vs Current

### Color tokens

| Token | Lovable uses | Current value | Gap |
|---|---|---|---|
| `bg-surface` | Card backgrounds, search button, nav buttons | **Does not exist** (we use `bg-card` or `bg-muted/50`) | **Add `--surface`** |
| `bg-sidebar-accent` | Active nav highlight | `oklch(0.930 0.007 264)` — exists but not used correctly | Fix usage |
| `text-sidebar-foreground` | All sidebar nav text | Exists but overridden by `text-muted-foreground` | Fix usage |
| `text-success` | Positive deltas, On track badge | **Does not exist** | **Add `--success`** |
| `text-warning` | At risk badge | **Does not exist** | **Add `--warning`** |
| `bg-primary-soft` | AI panel gradient | **Does not exist** | **Add `--primary-soft`** |
| `--destructive` | Behind badge, negative deltas | `oklch(0.577 0.245 27.325)` — exists | No change |

### Typography

| Element | Lovable | Current | Gap |
|---|---|---|---|
| `font-display` class | Used for large metric numbers and H1 | **Not defined** | **Add utility** |
| Nav text | `text-[13px]` | `text-sm` (14px) | Tighten by 1px |
| Stat label | `text-[11px] uppercase tracking-wider font-medium` | `text-xs uppercase tracking-wider` | Add `font-medium`, reduce size |
| Stat number | `font-display text-[24px] font-semibold tabular-nums` | `text-2xl font-bold tabular-nums` | Use `font-display`, `font-semibold` |
| Count badge | `text-[10px] font-mono text-muted-foreground` | No count badges | Add to sidebar |
| Section header | `text-[10px] font-medium uppercase tracking-wider` | Varies | Standardize |

### Spacing and sizing

| Element | Lovable | Current | Gap |
|---|---|---|---|
| Sidebar width | `w-60` (240px) | `w-[220px]` | +20px |
| Sidebar/TopBar height | `h-12` (48px) | `h-14` (56px) | −8px tighter |
| Nav icon size | `h-3.5 w-3.5 opacity-80` | `h-4 w-4` | Smaller, dimmed |
| Nav item padding | `px-2 py-1.5` | `px-3 py-2` | Tighter |
| TopBar padding | `px-5` | `px-6` | −4px |
| Search button height | `h-7` | No fixed height (`py-1.5`) | Standardize |
| Main content padding | `px-8 py-7` | Unknown | Needs check |

### Component patterns

#### Sidebar active state
- **Lovable:** `bg-sidebar-accent text-sidebar-accent-foreground font-medium`
- **Current:** `bg-primary/10 text-primary`
- **Gap:** Current uses primary color for active — Lovable uses a neutral sidebar-specific accent. Current reads more like a selection, Lovable reads more like a highlight. Both are acceptable, but Lovable's is lower contrast and more refined.

#### Stat cards
- **Lovable:** `rounded-lg border border-border bg-surface p-4` — no shadow, flat with border
- **Current:** `rounded-lg border border-border bg-card px-5 py-4 shadow-card`
- **Gap:** Lovable uses `bg-surface` (slightly different from `bg-card`) and removes explicit shadow (relies on border alone). More minimal.

#### Dashboard stat content
- **Lovable:** UPPERCASE label → large number → delta arrow + change → sub-label
- **Current:** UPPERCASE label → large number (no delta)
- **Gap:** Delta row is a visual enrichment. The actual data (changes vs last week) doesn't exist in our data model — would require computed values.

#### Portfolio health section
- **Lovable:** `grid grid-cols-4 divide-x divide-border` with progress bars, status badges, phase, due date
- **Current:** Not present in this form — we have different dashboard widgets
- **Gap:** This is a significant dashboard section we don't have, and it requires computed data (progress %, due dates). Implement as visual-only approximation if data exists.

#### Breadcrumb separator
- **Lovable:** Plain `/` text with `text-muted-foreground/50`
- **Current:** `<ChevronRight>` Lucide icon
- **Gap:** Minor. Both work. The `/` is closer to a path notation, slightly more editorial.

#### TopBar action buttons
- **Lovable:** `h-7` buttons — "Ask AI", Bell icon, "New"
- **Current:** No "New" button in TopBar. Search button has no fixed height.
- **Gap:** Standardize button heights to `h-7` in the header area.

---

## Valuable Improvements to Implement

These are pure visual/token changes with zero business logic risk:

### Tier 1 — High impact, very low risk
1. **Add `--surface` token** — closes the biggest visual gap; affects card styling globally
2. **Add `--success` and `--warning` tokens** — enables proper status badge colors
3. **Tighten sidebar + header heights** from `h-14` → `h-12` — creates a more compact, tool-like feel
4. **Fix sidebar active state** to use `bg-sidebar-accent text-sidebar-accent-foreground` instead of `bg-primary/10 text-primary`
5. **Shrink nav icons** from `h-4 w-4` → `h-3.5 w-3.5` with `opacity-80`
6. **Tighten nav item padding** from `px-3 py-2` → `px-2 py-1.5`
7. **Add `font-display` utility** for metric numbers

### Tier 2 — Medium impact, low risk
8. **Stat cards use `bg-surface`** instead of `bg-card` — more consistent with Lovable's palette
9. **Stat card labels**: add `font-medium` class, use `text-[11px]` instead of `text-xs`
10. **Stat card numbers**: switch from `font-bold text-2xl` → `font-semibold text-[24px] font-display`
11. **TopBar height** from `h-14` → `h-12`, padding from `px-6` → `px-5`
12. **Standardize header button heights** to `h-7` with `text-[12px]`
13. **Logo**: replace "AI" text badge with Sparkles icon for better visual identity
14. **Sidebar width**: `w-[220px]` → `w-60` (240px)

### Tier 3 — Lower priority, still safe
15. **Add `--primary-soft` token** for subtle primary-tinted backgrounds
16. **Breadcrumb separator**: ChevronRight → `/` text separator
17. **Stat card stat labels**: `text-xs` → `text-[11px]` across dashboard

---

## Improvements to Skip

| Feature | Reason to skip |
|---|---|
| Stat card delta indicators (+2, −8) | Requires computed change data — not in data model |
| "Today" task list with time slots | Completely different data model (time-blocked tasks) |
| AI Assistant panel | Feature, not styling |
| Portfolio health progress bars | Requires progress %, due dates — partial data at best |
| Inbox / Calendar / Insights nav items | Prototype-only routes, not in real app |
| Project dots in sidebar | Live data + new sidebar feature |
| User avatar footer | Persona data, not in data model |
| Count badges on nav items | Requires store reads — low priority |
| Font switch to Inter | Inter likely already installed via system, negligible visual gain vs risk |

---

## Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Adding new CSS tokens | Very low | Only affects `globals.css`. No TypeScript changes. |
| Changing `h-14` → `h-12` globally | Low | Sidebar + TopBar both change. Breadcrumb layout may need re-check. |
| Changing sidebar width | Low | Content area flex, will reflow naturally. |
| Adding `font-display` class | Very low | Additive utility, opt-in only. |
| Changing `bg-card` → `bg-surface` in dashboard | Low | Only affects DashboardPage stat cards. Isolated. |
| Changing active nav state colors | Low | Visual only, no logic. |

**Zero risk items:** All token additions, all opacity tweaks, all font-size adjustments.  
**Low risk items:** Height changes (Sidebar + TopBar), width change (Sidebar), active state color change.

No changes touch business logic, stores, repositories, routing, or entity models.

---

## Summary

The Lovable prototype introduces a tighter, more toollike aesthetic: everything is 8px shorter, icons are slightly smaller, typography is more precise (11px vs 12px labels, 13px vs 14px nav). The biggest structural addition is the `--surface` token which creates a three-tier surface hierarchy (background → surface → card) instead of the current two-tier system.

The dashboard stat card improvements (delta indicators, progress bars, health grid) are visually impressive but require data that doesn't exist — they are out of scope.

The implementable improvements cluster around spacing, token additions, and the sidebar/header refinement. These are all safe and will bring the platform visually closer to the Helm prototype without touching any logic.
