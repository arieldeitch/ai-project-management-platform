# UI Changelog
**Date:** 2026-06-06  
**Based on:** Lovable Helm prototype (https://indigo-zen-canvas.lovable.app)  
**Validation:** `npx tsc --noEmit` → 0 errors | `npx next build` → 21 routes clean

---

## Phase 1 — Token Foundation (`app/globals.css`)

### New CSS custom properties added to `:root`
| Token | Value | Purpose |
|---|---|---|
| `--surface` | `oklch(0.992 0.002 264)` | Between background and card — used for interactive elements, search buttons, stat cards |
| `--success` | `oklch(0.55 0.15 145)` | Semantic green — On track status, positive deltas |
| `--warning` | `oklch(0.72 0.16 65)` | Semantic amber — At risk status, caution states |
| `--primary-soft` | `oklch(0.94 0.03 264)` | Soft indigo tint — subtle primary-tinted backgrounds |

### New Tailwind color mappings added to `@theme inline {}`
- `--color-surface: var(--surface)`
- `--color-success: var(--success)`
- `--color-warning: var(--warning)`
- `--color-primary-soft: var(--primary-soft)`

### New utility class added to `@layer utilities`
```css
.font-display {
  font-family: var(--font-sans);
  font-feature-settings: "tnum";
}
```
Used for large metric numbers on dashboard stat cards.

---

## Phase 2 — Sidebar Refinement (`components/layout/Sidebar.tsx`)

| Element | Before | After |
|---|---|---|
| Width | `w-[220px]` | `w-60` (240px) |
| Header height | `h-14` (56px) | `h-12` (48px) |
| Header padding | `px-4` | `px-3` |
| Header border | `border-border` | `border-sidebar-border` |
| Logo container | `rounded` with "AI" text | `rounded-md` with Sparkles icon |
| App name size | `text-sm` (14px) | `text-[13px]` |
| Nav item padding | `px-3 py-2` | `px-2 py-1.5` |
| Nav item text | `text-sm font-medium` | `text-[13px]` (weight on active only) |
| Nav icon size | `h-4 w-4` | `h-3.5 w-3.5 opacity-80` |
| Active nav style | `bg-primary/10 text-primary` | `bg-sidebar-accent text-sidebar-accent-foreground font-medium` |
| Inactive nav style | `text-muted-foreground hover:bg-muted hover:text-foreground` | `text-sidebar-foreground hover:bg-sidebar-accent/60` |
| Nav gap | `gap-1` | `gap-px` |
| Nav padding | `p-3` | `p-2` |
| Bottom padding | `p-3` | `p-2` |
| Bottom border | `border-border` | `border-sidebar-border` |

**Import added:** `Sparkles` from `lucide-react`

---

## Phase 3 — TopBar Refinement (`components/layout/TopBar.tsx`)

| Element | Before | After |
|---|---|---|
| Header height | `h-14` (56px) | `h-12` (48px) |
| Header padding | `px-6` | `px-5` |
| Title font size | `text-lg` (18px) | `text-[13px]` |
| Action gap | `gap-2` | `gap-1.5` |
| Search button height | No fixed height (`py-1.5`) | `h-7` (28px) |
| Search button background | `bg-muted/50` | `bg-surface` |
| Search button text size | `text-xs` (12px) | `text-[12px]` |

---

## Phase 4 — Dashboard Stat Cards (`features/dashboard/components/DashboardPage.tsx`)

Changes to `StatCard` sub-component only:

| Element | Before | After |
|---|---|---|
| Card background | `bg-card` | `bg-surface` |
| Card padding | `px-5 py-4` | `p-4` |
| Card shadows | `shadow-card hover:shadow-card-hover` | Removed (border-only) |
| Card hover | `hover:bg-muted/30` | `hover:bg-muted/20` |
| Label size | `text-xs` (12px) | `text-[11px]` |
| Number size | `text-2xl` | `text-[24px]` |
| Number weight | `font-bold` | `font-semibold` |
| Number font | — | `font-display` |
| Number margin | `mt-1` | `mt-1.5` |

---

## Phase 5 — Breadcrumb Separators (4 detail pages)

Changed in: `ProjectDetailPage.tsx`, `AssetDetailPage.tsx`, `DecisionDetailPage.tsx`, `KnowledgeDetailPage.tsx`

| Element | Before | After |
|---|---|---|
| Separator element | `<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />` | `<span className="text-muted-foreground/50 select-none">/</span>` |
| Import | `ChevronRight` included | `ChevronRight` removed |

---

## Files Modified (8 total)

| File | Phase | Change type |
|---|---|---|
| `app/globals.css` | 1 | Additive: 4 tokens + 1 utility class |
| `components/layout/Sidebar.tsx` | 2 | Spacing, colors, icon replacement |
| `components/layout/TopBar.tsx` | 3 | Spacing, colors |
| `features/dashboard/components/DashboardPage.tsx` | 4 | StatCard component only |
| `features/projects/components/ProjectDetailPage.tsx` | 5 | Breadcrumb separator |
| `features/assets/components/AssetDetailPage.tsx` | 5 | Breadcrumb separator |
| `features/decisions/components/DecisionDetailPage.tsx` | 5 | Breadcrumb separator |
| `features/knowledge/components/KnowledgeDetailPage.tsx` | 5 | Breadcrumb separator |

## Files NOT Modified (scope maintained)
- All `store/` files — unchanged
- All `data/` files — unchanged
- All `types/` files — unchanged
- All `lib/` files — unchanged
- All route `page.tsx` files — unchanged
- All list pages — unchanged
- All form pages — unchanged
- `CommandPalette.tsx` — unchanged
- `next.config.ts`, `tsconfig.json`, `package.json` — unchanged
