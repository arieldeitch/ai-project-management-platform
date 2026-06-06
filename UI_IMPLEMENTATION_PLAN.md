# UI Implementation Plan — Helm Design Adoption
**Based on:** LOVABLE_UI_REVIEW.md  
**Date:** 2026-06-06  
**Scope:** Visual polish only. No business logic, stores, repositories, routing, or entities.

---

## Constraints (Hard Rules)
- Do NOT modify: `store/`, `data/`, `types/`, `lib/constants/`, `lib/hooks/`
- Do NOT add new routes or pages
- Do NOT add or remove npm packages
- Do NOT create `tailwind.config.js`
- All tokens stay in `app/globals.css` under `@theme inline {}`
- TypeScript must remain at 0 errors after every change

---

## Implementation Order

Work in this exact sequence. Each phase is independently buildable and testable.

---

## Phase 1 — Token Foundation
**File:** `app/globals.css`  
**Estimated effort:** 10 minutes  
**Risk:** Very low (additive only)

### Changes
1. Add `--surface` token to `@theme inline {}` and `:root`
2. Add `--success` token to `@theme inline {}` and `:root`
3. Add `--warning` token to `@theme inline {}` and `:root`
4. Add `--primary-soft` token to `@theme inline {}` and `:root`
5. Add `.font-display` utility class

### Exact values

In `@theme inline {}`, add:
```css
--color-surface: var(--surface);
--color-success: var(--success);
--color-warning: var(--warning);
--color-primary-soft: var(--primary-soft);
```

In `:root`, add:
```css
--surface: oklch(0.992 0.002 264);      /* between background and card */
--success: oklch(0.55 0.15 145);        /* emerald green */
--warning: oklch(0.72 0.16 65);         /* amber */
--primary-soft: oklch(0.94 0.03 264);   /* soft indigo tint */
```

In `@layer utilities`, add:
```css
.font-display {
  font-family: var(--font-sans);
  font-feature-settings: "tnum";
}
```

### Test
`npx tsc --noEmit` — no errors (CSS-only change, guaranteed pass).

---

## Phase 2 — Sidebar Refinement
**File:** `components/layout/Sidebar.tsx`  
**Estimated effort:** 15 minutes  
**Risk:** Low

### Changes
1. Width: `w-[220px]` → `w-60`
2. Header height: `h-14` → `h-12`
3. Header padding: `px-4` → `px-3`
4. Logo container: `rounded` → `rounded-md`; replace "AI" text with Sparkles Lucide icon
5. App name: `text-sm` → `text-[13px]`
6. Nav item padding: `px-3 py-2` → `px-2 py-1.5`
7. Nav text: `text-sm font-medium` → `text-[13px]` (weight handled by active state)
8. Nav icons: `h-4 w-4 shrink-0` → `h-3.5 w-3.5 shrink-0 opacity-80`
9. Active state: `bg-primary/10 text-primary` → `bg-sidebar-accent text-sidebar-accent-foreground font-medium`
10. Inactive state: `text-muted-foreground hover:bg-muted hover:text-foreground` → `text-sidebar-foreground hover:bg-sidebar-accent/60`
11. Bottom section: `p-3` → `p-2`
12. Add `import { Sparkles } from 'lucide-react'`

### Test
All 6 navigation items render and are clickable. Active item highlights correctly. Sidebar width visually wider. Icons slightly smaller.

---

## Phase 3 — TopBar Refinement
**File:** `components/layout/TopBar.tsx`  
**Estimated effort:** 10 minutes  
**Risk:** Low

### Changes
1. Height: `h-14` → `h-12`
2. Padding: `px-6` → `px-5`
3. Search button: add `h-7` class, change `bg-muted/50` → `bg-surface`, `text-xs` → `text-[12px]`
4. Title div: `text-lg font-semibold text-foreground tracking-tight` → `text-[13px] font-semibold text-foreground tracking-tight`
   - Note: breadcrumb pages already use `text-sm` in their TopBar title spans — this change makes plain string titles match
5. Keep existing `{actions}` slot (unchanged)

### Affected pages (TopBar title prop callers)
All 4 detail pages already pass ReactNode breadcrumbs — visual only change, no JSX changes needed there.  
List pages pass plain strings → font size reduction matches Lovable spec.

### Test
All 6 sections render correct page title. Breadcrumb layout unchanged (links still work). Search button opens command palette.

---

## Phase 4 — Dashboard Stat Cards
**File:** `features/dashboard/components/DashboardPage.tsx`  
**Estimated effort:** 15 minutes  
**Risk:** Low (component-internal only)

### Changes to `StatCard` component (lines 48–70)
1. Background: `bg-card` → `bg-surface`
2. Padding: `px-5 py-4` → `p-4`
3. Shadow: remove `shadow-card hover:shadow-card-hover` (Lovable uses border alone)
4. Label: `text-xs font-medium` → `text-[11px] font-medium`
5. Number: `text-2xl font-bold` → `text-[24px] font-semibold font-display`
6. Add `mt-1` spacing on label (currently `mt-1` on number — move it)

### Result
Stat cards become flatter (border only, no shadow), slightly denser, and numbers get the display treatment.

### Test
Dashboard loads. 4 stat cards display counts. Domain filter tabs work. FocusCard still visible.

---

## Phase 5 — Breadcrumb Separator (Optional Polish)
**Files:** 4 detail pages  
**Estimated effort:** 5 minutes each × 4 = 20 minutes  
**Risk:** Very low  

### Change
In `ProjectDetailPage.tsx`, `AssetDetailPage.tsx`, `DecisionDetailPage.tsx`, `KnowledgeDetailPage.tsx`:

Replace `<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />` with:
```tsx
<span className="text-muted-foreground/50 select-none">/</span>
```
Remove `ChevronRight` from the import statement in each file.

### Test
Navigate to any detail page. Breadcrumb renders "Section / Item Name" with slash separator.

---

## Files Modified Summary

| File | Phase | Change type | Risk |
|---|---|---|---|
| `app/globals.css` | 1 | Add tokens + utility | Very low |
| `components/layout/Sidebar.tsx` | 2 | Spacing, colors, icon | Low |
| `components/layout/TopBar.tsx` | 3 | Spacing, colors | Low |
| `features/dashboard/components/DashboardPage.tsx` | 4 | StatCard refinement | Low |
| `features/projects/components/ProjectDetailPage.tsx` | 5 | Breadcrumb separator | Very low |
| `features/assets/components/AssetDetailPage.tsx` | 5 | Breadcrumb separator | Very low |
| `features/decisions/components/DecisionDetailPage.tsx` | 5 | Breadcrumb separator | Very low |
| `features/knowledge/components/KnowledgeDetailPage.tsx` | 5 | Breadcrumb separator | Very low |

**Total files: 8**  
**Zero store/repository/type/route changes.**

---

## Not Implementing (Confirmed Out of Scope)

| Item | Reason |
|---|---|
| Stat card deltas (+2, −8) | Requires historical data not in data model |
| Today task panel with time slots | Different data model entirely |
| AI Assistant panel | Feature, not styling |
| Portfolio health progress bars | Requires completion % and due dates |
| Inbox / Calendar / Insights routes | Prototype-only, no backing functionality |
| Project dots in sidebar | New feature requiring live data wiring |
| User avatar footer | Persona data not in data model |
| Nav item count badges | Feature scope, low visual value |
| Font switch to Inter | Stack-disruptive, marginal gain |

---

## Post-Implementation Checklist

```
[ ] npx tsc --noEmit       → 0 errors
[ ] npx next build         → 21 routes, 0 warnings
[ ] Dashboard loads         → stat cards visible, domain tabs work
[ ] Projects list loads     → filter tabs, rows, hover actions
[ ] Project detail loads    → breadcrumb navigates correctly
[ ] Search opens            → ⌘K opens palette, results appear
[ ] All 6 nav items work    → active state correct on each section
[ ] Sidebar renders         → Sparkles logo, correct width, tight spacing
[ ] TopBar renders          → h-12, search button styled, title correct
```
