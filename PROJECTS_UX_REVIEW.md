# Projects Screen — UX Review
**Date:** 2026-06-06  
**File under review:** `features/projects/components/ProjectsListPage.tsx`

---

## Current Structure

```
[TopBar — "Projects" + New Project button]
[Filter bar — Status tabs | Domain pills | Sort buttons]
[Scrollable list of ProjectRow components]
```

Each `ProjectRow`:
```
[name + domain badge] ............. [PriorityBadge] [StatusBadge] [updated] [→]
[→ next_action or blocked_reason in text-xs muted]
```

---

## Problem 1: Projects Look Like Table Rows

**What's happening:**  
`flex items-start gap-4 border-b border-border px-6 py-3.5` — this is a flat list row. It has no visual grouping, no card affordance, no depth.

**Why it matters:**  
A flat list with `border-b` only communicates a list of equals. Projects are not equals — they have different urgency, different states, different execution demands. The layout doesn't communicate any of that.

**Evidence:**  
Every project — active, blocked, idea, completed — renders at the same visual weight with the same horizontal layout.

---

## Problem 2: Next Action Is Visually Weaker Than Metadata

**What's happening:**  
```
→ {project.next_action}
```
Rendered as `text-xs text-muted-foreground` — smaller and dimmer than the status badge.

**Why it matters:**  
The next action is the most operationally relevant piece of data on the screen. It tells you what to do. But visually it reads at a lower priority than `PriorityBadge` and `StatusBadge`, which are just labels.

**Evidence:**  
`PriorityBadge` renders as `text-xs font-medium` with a colored background pill. `StatusBadge` same. Both are visually bold. Next action is `text-xs text-muted-foreground` — literally the dimmest text on the row.

**Desired fix:**  
Next action should be `text-sm` or `text-[13px]` with `text-foreground/80` — readable, not muted. The arrow `→` should be `text-primary` not gray.

---

## Problem 3: Status and Priority Are Disconnected From Context

**What's happening:**  
Status and Priority badges are right-aligned in a trailing cluster: `[PriorityBadge] [StatusBadge] [updated] [→]`.

**Why it matters:**  
The status is the most context-critical piece of information about a project. Putting it at the far right means the eye reads name → metadata → status. But status should modify how you read the name. "India Returns App (BLOCKED)" reads differently than "India Returns App (ACTIVE)".

**Evidence:**  
On a wide screen, the status badge can be 400–600px away from the project name it describes.

**Desired fix:**  
Status should be communicated via a persistent left-edge color bar (4px border-l) so it's immediately visible at scan time, before the name is even read.

---

## Problem 4: Blocked Projects Don't Stand Out

**What's happening:**  
Blocked projects render identically to active projects except:
- `StatusBadge` shows "Blocked" with a red animated dot
- `blocked_reason` replaces `next_action` in `text-xs text-red-600/80`

**Why it matters:**  
Blocked projects are the highest-urgency items in the portfolio — they represent stopped work. But visually they're 90% identical to active projects. The blocked state needs to be immediately obvious.

**Evidence:**  
```tsx
// blocked treatment:
<AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
<p className="text-xs text-red-600/80 dark:text-red-400/70 line-clamp-1">
  {project.blocked_reason}
</p>
```
A tiny `h-3 w-3` icon and `text-xs text-red-600/80` (low opacity) does not communicate urgency.

**Desired fix:**  
- Left edge: `border-l-4 border-l-red-500`
- Background: `bg-red-50/40`
- Blocked reason: `text-[13px] font-medium text-red-700` (not `text-xs opacity-80`)
- AlertTriangle: `h-4 w-4` not `h-3 w-3`

---

## Problem 5: Active Projects Don't Stand Out

**What's happening:**  
Active projects use the same visual treatment as scoped, idea, and deferred projects. The `StatusBadge` shows "Active" but there's no structural emphasis.

**Why it matters:**  
Active projects are what you're currently working on. They should be the most visually prominent items when the "All" filter is active.

**Desired fix:**  
- Left edge: `border-l-4 border-l-emerald-500`
- Background: `bg-emerald-50/20`

---

## Problem 6: Too Many Controls Competing for Attention

**What's happening:**  
The filter bar has three separate control groups in one row:
1. Status tabs (8 options, underline style)
2. Domain pills (4 options, `border-l` separator)
3. Sort buttons (3 options, `border-l` separator)

**Why it matters:**  
On a typical 1440px desktop screen, these controls fill the entire horizontal space. The domain and sort controls are visually indistinguishable from navigation — they look like more tabs.

**Desired fix:**  
- Keep status tabs as primary (they are the main filter)
- De-emphasize domain and sort with a distinct secondary row or tighter grouping with clearer labels

---

## Problem 7: Information Hierarchy Is Weak

**Current hierarchy (visual weight, top to bottom, left to right):**
1. Project name (`text-sm font-medium`) — reads as body text
2. PriorityBadge (colored pill) — reads as a tag
3. StatusBadge (colored pill) — reads as a tag  
4. Next action (`text-xs text-muted-foreground`) — reads as supporting text
5. Domain (`DomainBadge`) — reads as a tag
6. Updated (`text-xs text-muted-foreground`) — reads as caption

**Problems:**
- Priority/Status badges (3) > Project name (1) in visual weight
- Next action (4) is weaker than the timestamp (6) they share the same style
- All metadata items compete equally with each other

**Desired hierarchy:**
1. Project name — strongest, `text-[15px] font-semibold`
2. Next action — strong, `text-[13px] font-medium text-foreground/80`
3. Blocked reason — urgent, `text-[13px] font-medium text-red-700`
4. Status + Priority — small inline badges
5. Domain — small dim tag
6. Updated — smallest, trailing caption

---

## Summary Table

| Problem | Severity | Root cause |
|---|---|---|
| Rows look like table rows | High | No `rounded-lg`, no card frame, no visual grouping |
| Next action too weak | High | `text-xs text-muted-foreground` |
| Status disconnected from name | Medium | Right-aligned badges, no left-edge treatment |
| Blocked not prominent enough | High | `text-xs opacity-80`, `h-3` icon |
| Active not prominent enough | Medium | No visual differentiation |
| Too many controls competing | Low | Three control groups, same visual weight |
| Weak information hierarchy | High | Metadata same weight as content |
