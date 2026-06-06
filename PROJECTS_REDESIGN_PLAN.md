# Projects Screen — Redesign Plan
**Date:** 2026-06-06  
**Based on:** PROJECTS_UX_REVIEW.md  
**Principle:** Execution first → Portfolio second → Metadata third

---

## Constraints

- Do NOT modify: stores, repositories, Dexie, IndexedDB, search, routing, data model
- Do NOT change: filter logic, sort logic, status count logic, domain count logic
- Do NOT remove any existing functionality
- `npx tsc --noEmit` must stay at 0 errors

---

## File Modified

**Only one file changes:** `features/projects/components/ProjectsListPage.tsx`

All other files are unchanged:
- `components/shared/StatusBadge.tsx` — unchanged
- `components/shared/PriorityBadge.tsx` — unchanged
- `components/shared/DomainBadge.tsx` — unchanged
- All store, repository, type, and route files — unchanged

---

## Change 1: `ProjectRow` → `ProjectCard`

Replace the flat row component with a card component.

### Card structure
```
┌── [4px left accent border, color by status] ─────────────────────────┐
│                                                                       │
│  PROJECT NAME (text-[15px] font-semibold)    [Priority] [Status]     │
│  → NEXT ACTION (text-[13px] font-medium text-foreground/75)          │
│  ⚠ BLOCKED REASON (text-[13px] font-medium text-red-700)             │
│                                              [Domain]   [updated]    │
└───────────────────────────────────────────────────────────────────────┘
```

### Left accent border mapping

| Status | Left border | Background |
|---|---|---|
| `active` | `border-l-4 border-l-emerald-500` | `bg-emerald-50/30` |
| `blocked` | `border-l-4 border-l-red-500` | `bg-red-50/40` |
| `scoped` | `border-l-4 border-l-sky-400` | `bg-sky-50/20` |
| `idea` | `border-l border-border` | none |
| `completed` | `border-l border-border` | none, `opacity-55` |
| `deferred` | `border-l border-border` | none, `opacity-55` |
| `archived` | `border-l border-border` | none, `opacity-40` |

### Name treatment

| Status | Name style |
|---|---|
| `active` | `text-[15px] font-semibold text-foreground group-hover:text-primary` |
| `blocked` | `text-[15px] font-semibold text-foreground group-hover:text-primary` |
| `scoped` | `text-[15px] font-semibold text-foreground group-hover:text-primary` |
| `idea` | `text-[14px] font-medium text-foreground group-hover:text-primary` |
| `completed/deferred/archived` | `text-[14px] font-medium text-muted-foreground` |

### Next action treatment (when not blocked)

```tsx
{project.next_action && (
  <div className="mt-1.5 flex items-baseline gap-1.5">
    <span className="text-[11px] font-bold text-primary shrink-0">→</span>
    <p className="text-[13px] font-medium text-foreground/75 line-clamp-2">
      {project.next_action}
    </p>
  </div>
)}
```

Upgrade from: `text-xs text-muted-foreground` + `text-foreground/75 text-[13px] font-medium`

### Blocked reason treatment

```tsx
{project.status === 'blocked' && project.blocked_reason && (
  <div className="mt-1.5 flex items-start gap-1.5">
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
    <p className="text-[13px] font-medium text-red-700 line-clamp-2">
      {project.blocked_reason}
    </p>
  </div>
)}
```

Upgrade from: `h-3 w-3` icon + `text-xs text-red-600/80` (low opacity)

### Metadata footer

```tsx
<div className="mt-2.5 flex items-center justify-between">
  <div className="flex items-center gap-1.5">
    {/* Priority badge only if not unset */}
    {project.priority !== 'unset' && <PriorityBadge priority={project.priority} />}
    <StatusBadge status={project.status} />
  </div>
  <div className="flex items-center gap-2">
    {project.domain && <DomainBadge domain={project.domain} />}
    <span className="text-[11px] text-muted-foreground">{updatedAt}</span>
  </div>
</div>
```

Key changes:
- Status and Priority move to footer (below name + action) — metadata comes after content
- `Priority` only shown if not `unset` (cleaner when unset)
- Domain + updated timestamp are right-aligned in the footer

---

## Change 2: List Container

### Before
```tsx
<div>
  {filtered.map((p) => (
    <ProjectRow key={p.id} project={p} />
  ))}
</div>
```

### After
```tsx
<div className="space-y-2 p-4">
  {filtered.map((p) => (
    <ProjectCard key={p.id} project={p} />
  ))}
</div>
```

Cards float in the content area with 8px gaps. Breathing room on all sides.

---

## Change 3: Filter Bar — Minor Improvements

The filter bar structure stays the same. Minor visual tightening only:

1. Add `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` labels to domain and sort sections (so they read as labeled groups, not more tabs)
2. Tighten the secondary bar: domain and sort on same line, clearly separated from status tabs

### Before
```
[All][Active 3][Blocked 3][Scoped 2][Idea 11]... | [All][Personal][Work][General] | [↕][status][priority][updated]
```

### After (same logic, cleaner presentation)
```
[All][Active 3][Blocked 3][Scoped 2][Idea 11]...
                                     DOMAIN [All][Personal][Work][General]  SORT [status][priority][updated]
```

Implementation: add `<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Domain</span>` label before domain buttons, same for sort.

---

## Complete `ProjectCard` Component

```tsx
function ProjectCard({ project }: { project: Project }) {
  const updatedAt = formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
  const isBlocked = project.status === 'blocked'
  const isActive = project.status === 'active'
  const isScoped = project.status === 'scoped'
  const isDimmed = project.status === 'completed' || project.status === 'deferred' || project.status === 'archived'

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group block rounded-lg border transition-colors',
        isBlocked && 'border-red-200 border-l-4 border-l-red-500 bg-red-50/40 hover:bg-red-50/60',
        isActive && 'border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/30',
        isScoped && 'border-sky-200 border-l-4 border-l-sky-400 bg-sky-50/10 hover:bg-sky-50/20',
        !isBlocked && !isActive && !isScoped && 'border-border hover:bg-muted/40',
        isDimmed && 'opacity-55',
      )}
    >
      <div className="px-4 py-3.5">
        {/* Name row */}
        <p className={cn(
          'font-semibold leading-snug group-hover:text-primary transition-colors',
          isDimmed ? 'text-[14px] text-muted-foreground' : 'text-[15px] text-foreground',
        )}>
          {project.name}
        </p>

        {/* Action / reason row */}
        {isBlocked && project.blocked_reason ? (
          <div className="mt-1.5 flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
            <p className="text-[13px] font-medium text-red-700 line-clamp-2">
              {project.blocked_reason}
            </p>
          </div>
        ) : project.next_action ? (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-primary shrink-0 leading-none">→</span>
            <p className="text-[13px] font-medium text-foreground/75 line-clamp-2">
              {project.next_action}
            </p>
          </div>
        ) : project.description ? (
          <p className="mt-1 text-[13px] text-muted-foreground line-clamp-1">
            {project.description}
          </p>
        ) : null}

        {/* Metadata footer */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {project.priority !== 'unset' && <PriorityBadge priority={project.priority} />}
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-2">
            {project.domain && <DomainBadge domain={project.domain} />}
            <span className="text-[11px] text-muted-foreground tabular-nums">{updatedAt}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
```

---

## Before / After Comparison

### Blocked project — Before
```
[AlertTriangle 12px] India Returns App  [DomainBadge] ... [High] [Blocked •] [3d ago] [→]
                     Waiting for India team response (text-xs opacity-80)
```

### Blocked project — After
```
┌── [RED LEFT BORDER] ─────────────────────────────────────────────────┐
│  India Returns App                                                    │
│  ⚠ Waiting for India team response (red, medium weight, 13px)        │
│  [High Priority] [● Blocked]                       [Work] [3d ago]   │
└───────────────────────────────────────────────────────────────────────┘
```

### Active project — Before
```
Task Management Platform [General]    [High] [Active ●] [5h ago] [→]
→ Import clean seed data (text-xs muted)
```

### Active project — After
```
┌── [GREEN LEFT BORDER] ──────────────────────────────────────────────┐
│  Task Management Platform                                            │
│  → Import clean seed data, begin daily use (13px, foreground/75)    │
│  [High Priority] [● Active]                  [General]  [5h ago]    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## TypeScript Safety

- No new types introduced
- `project.priority !== 'unset'` is a valid runtime check (string comparison, no type cast)
- All existing props/state/logic preserved exactly
- `cn()` calls use only string literals and ternaries — no dynamic class generation
- `isDimmed` boolean covers `completed | deferred | archived` without touching the type system

---

## Post-Implementation Checklist

```
[ ] npx tsc --noEmit → 0 errors
[ ] npx next build → 21 routes, 0 warnings
[ ] Projects list loads with cards (not flat rows)
[ ] Blocked projects: red left border + red blocker text
[ ] Active projects: green left border + emphasized next action
[ ] Scoped projects: sky left border
[ ] Completed/Deferred/Archived: dimmed opacity
[ ] Status filter tabs still work
[ ] Domain filter still works
[ ] Sort still works
[ ] Clicking a card navigates to project detail
[ ] Empty state still renders
```
