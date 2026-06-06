# Workflow Governance Proposal
**Date:** 2026-06-06
**Status:** Proposal — no code changes made
**Scope:** Lifecycle enforcement · Draft gates · GPT Specification · GPT Setup · Knowledge readiness · Feature/Bug model · Kanban governance

---

## Problem

The current system tracks project state but does not enforce how projects move through it. A project can jump from `idea` directly to `active` without a defined goal, without a GPT assigned, without any documentation. This defeats the purpose of a disciplined workflow tool.

The gaps:
- No definition of what "ready to start" means
- Status can change freely with no validation
- No enforcement that GPT is assigned and configured before development
- No enforcement that required knowledge documents exist
- Tasks are a flat list with no type distinction (feature vs bug vs task)
- The Kanban board is a view, not an enforcement surface

---

## Lifecycle Stages

Every new project starts at `draft`. Each transition is gated.

| Status | Hebrew | Gate |
|--------|--------|------|
| `draft` | טיוטה | New project default. Requires completion of 9 core fields before advancing. |
| `scoped` | ממוסגר | Draft fields complete. Project is defined and scoped. |
| `gpt_setup` | הגדרת GPT | GPT Specification exists. User configures the project GPT. |
| `ready_for_development` | מוכן לפיתוח | GPT configured + all required docs present. |
| `in_development` | בפיתוח | Repository or local folder path set (or exception documented). |
| `testing` | בבדיקה | At least one Feature task with acceptance criteria exists. |
| `deployed` | מוצב | production_url or vercel_url exists (or deployment_not_applicable = true). |
| `active` | פעיל | Release Notes + Deployment Report both exist. |
| `blocked` | חסום | Cross-cutting — can be set at any stage. |
| `completed` | הושלם | Terminal state. |
| `deferred` | נדחה | Terminal state. |
| `archived` | ארכיון | Terminal state. |

**Removed status:** `idea` — replaced by `draft`. Migration: all existing `idea` records → `draft`.

---

## Status Transition Rules

Transitions are **computed** at runtime from current data. No stored "gate passed" flags.

### draft → scoped
**Requires all 9 fields to be non-empty:**
1. `idea` — the project concept (text field, free prose)
2. `goal` — what the project achieves
3. `target_audience` — who benefits
4. `data_storage_type` — `local | cloud | hybrid | not_relevant`
5. `platform_type` — `web | mobile | desktop | automation | gpt_only | other`
6. `project_type` — existing enum (software | ai_agent | automation | operations | research | personal | infrastructure)
7. `priority` — existing enum (must not be `unset`)
8. `reason` — business or personal justification
9. `next_action` — the immediate next step

### scoped → gpt_setup
**Requires:**
- KnowledgeItem with `doc_role = 'gpt_specification'` linked to this project exists

This is satisfied by generating the GPT Specification document (see Phase 3).

### gpt_setup → ready_for_development
**Requires all of:**
- `assigned_gpt` is set
- `gpt_role` is set
- `knowledge_uploaded = true`
- KnowledgeItems exist for: `gpt_specification`, `handoff_document`, `implementation_blueprint`

### ready_for_development → in_development
**Requires:**
- `repository_url` OR `local_folder_path` is set
- OR `deployment_not_applicable = true` with `reason` documenting why

### in_development → testing
**Requires:**
- At least one Task linked to this project with `task_type = 'feature'` AND `acceptance_criteria` is non-empty

### testing → deployed
**Requires:**
- `production_url` OR `vercel_url` is set
- OR `deployment_not_applicable = true`

### deployed → active
**Requires:**
- KnowledgeItems exist for: `release_notes`, `deployment_report`

### Any stage → blocked
Always allowed. Requires `blocked_reason` to be set.

### blocked → previous stage
Allowed when `blocked_reason` is cleared and the previous stage gate is still satisfied.

---

## Validation Architecture

All transition logic lives in a single utility module:

```
lib/workflow/governance.ts
```

Exports:
```typescript
getTransitionBlockers(
  project: Project,
  tasks: Task[],
  knowledgeItems: KnowledgeItem[],
  targetStatus: ProjectStatus
): string[]   // [] means allowed; non-empty means blocked with reasons

getDraftCompletionStatus(project: Project): {
  complete: boolean
  missing: DraftField[]
}

getRequiredDocStatus(
  project: Project,
  knowledgeItems: KnowledgeItem[]
): DocCheckResult[]
```

**No side effects. Pure functions only.** UI calls these before allowing a status change. Nothing in the store enforces this — enforcement is at the UI layer.

---

## Data Model Changes

### Project — new fields

| Field | Type | Gate |
|-------|------|------|
| `idea` | `string \| undefined` | Required for draft → scoped |
| `target_audience` | `string \| undefined` | Required for draft → scoped |
| `data_storage_type` | `DataStorageType \| undefined` | Required for draft → scoped |
| `platform_type` | `PlatformType \| undefined` | Required for draft → scoped |
| `reason` | `string \| undefined` | Required for draft → scoped |
| `gpt_url` | `string \| undefined` | Shown in GPT Setup section |
| `gpt_role` | `string \| undefined` | Required for gpt_setup → ready |
| `knowledge_uploaded` | `boolean \| undefined` | Required for gpt_setup → ready |
| `uploaded_knowledge_files` | `string \| undefined` | Informational, shown in GPT Setup |
| `deployment_not_applicable` | `boolean \| undefined` | Exception for non-deployable projects |

**New types:**
```typescript
type DataStorageType = 'local' | 'cloud' | 'hybrid' | 'not_relevant'
type PlatformType = 'web' | 'mobile' | 'desktop' | 'automation' | 'gpt_only' | 'other'
```

**Status type change:**
```typescript
// Before
type ProjectStatus = 'idea' | 'scoped' | 'active' | 'blocked' | 'completed' | 'deferred' | 'archived'

// After
type ProjectStatus =
  | 'draft' | 'scoped' | 'gpt_setup' | 'ready_for_development'
  | 'in_development' | 'testing' | 'deployed' | 'active'
  | 'blocked' | 'completed' | 'deferred' | 'archived'
```

### KnowledgeItem — new DocRole value

```typescript
// Add to DocRole
type DocRole =
  | 'gpt_specification'        // NEW
  | 'handoff_document'
  | 'implementation_blueprint'
  | 'ux_notes'
  | 'decisions_log'
  | 'execution_board'
  | 'release_notes'
  | 'deployment_report'
  | 'recovery_report'
```

### Task — new fields

| Field | Type | Applies to |
|-------|------|-----------|
| `task_type` | `'task' \| 'feature' \| 'bug' \| undefined` | All tasks |
| `user_value` | `string \| undefined` | Feature only |
| `acceptance_criteria` | `string \| undefined` | Feature only (required for in_development → testing gate) |
| `scope` | `'mvp' \| 'later' \| 'deferred' \| undefined` | Feature only |
| `severity` | `'critical' \| 'high' \| 'medium' \| 'low' \| undefined` | Bug only |
| `steps_to_reproduce` | `string \| undefined` | Bug only |
| `expected_behavior` | `string \| undefined` | Bug only |
| `actual_behavior` | `string \| undefined` | Bug only |
| `environment` | `string \| undefined` | Bug only |

Tasks without `task_type` set behave as `'task'` — no change to existing records.

---

## GPT Specification Generation

### Trigger
Button in Project Detail page — visible when `status = 'scoped'` and no GPT Specification exists.

### Behavior
Generates a `KnowledgeItem` with:
- `title`: `GPT Specification — [project.name]`
- `doc_role`: `'gpt_specification'`
- `doc_status`: `'current'`
- `project_id`: linked project
- `body`: Markdown document filled from project data

### Template body
```markdown
# GPT Specification — [name]

## פרטי הפרויקט
- **שם:** [name]
- **רעיון:** [idea]
- **מטרה:** [goal]
- **קהל יעד:** [target_audience]
- **סוג אחסון נתונים:** [data_storage_type]
- **פלטפורמה:** [platform_type]
- **סוג פרויקט:** [project_type]
- **עדיפות:** [priority]
- **הסיבה לפרויקט:** [reason]

## בעיה ופתרון
**הבעיה שנפתרת:** [ממתין למילוי]
**MVP:** [ממתין למילוי]
**מחוץ לסקופ:** [ממתין למילוי]

## פרטיות ואבטחה
[ממתין למילוי]

## כלי עבודה וסגנון
- **כלי עבודה מועדפים:** Claude Code CLI, TypeScript, Next.js
- **סגנון עבודה:** Solo builder עם סיוע AI
- **רמת מעורבות בהחלטות:** [ממתין למילוי]
- **העדפת vibe coding:** [ממתין למילוי]

## הוראות ל-GPT של הפרויקט
[ממתין למילוי]

## מסמכי ידע נדרשים
- [ ] Handoff Document
- [ ] Implementation Blueprint
- [ ] UX Notes

## שאלות פתוחות
[ממתין למילוי]
```

Brackets `[ממתין למילוי]` = "awaiting completion." The template is a starting point — user fills in the remaining sections in the Knowledge editor.

### After generation
Project status does NOT automatically advance. The user manually transitions `scoped → gpt_setup` after confirming the specification looks correct.

---

## Migration Impact

### Dexie version: 4 → 5

All changes are additive. No data loss.

```typescript
// Upgrade callback required only for status rename
db.version(5).stores({
  projects: '++id, status, priority, domain, project_type, data_storage_type, platform_type',
  tasks: '++id, project_id, status, priority, task_type',
  knowledge: '++id, project_id, item_type, doc_role',
  // assets and decisions unchanged
}).upgrade(trans => {
  // Rename 'idea' status to 'draft'
  trans.table('projects').toCollection().modify(project => {
    if (project.status === 'idea') project.status = 'draft'
  })
})
```

**Existing data after migration:**
- All `idea` projects become `draft` — correct, they haven't been scoped
- All other statuses unchanged — `scoped`, `active`, `blocked`, `completed`, `deferred`, `archived`
- Note: existing `active` projects bypass the new lifecycle gates — they were created before governance existed. This is intentional and correct.
- New governance fields on existing records = `undefined` — no validation errors since gates are only checked on explicit status transition

---

## UI Changes

### 1. Project Detail — Workflow Progress Panel

New collapsible panel, inserted between the meta card and the Execution Context card.

```
┌─ מצב תהליך ──────────────────────────────────────┐
│  שלב נוכחי: טיוטה                                  │
│                                                    │
│  כדי לעבור לממוסגר:                               │
│  ✗ רעיון — חסר                                    │
│  ✓ מטרה — מלא                                    │
│  ✗ קהל יעד — חסר                                  │
│  ✗ סוג אחסון — לא נבחר                            │
│  ✗ פלטפורמה — לא נבחרה                            │
│  ✓ סוג פרויקט — software                          │
│  ✓ עדיפות — high                                  │
│  ✗ סיבה לפרויקט — חסרה                            │
│  ✓ פעולה הבאה — מלאה                              │
│                                                    │
│  [לא ניתן לקדם — 4 שדות חסרים]                    │
└────────────────────────────────────────────────────┘
```

When all blockers cleared, button becomes active:
```
[קדם לשלב הבא: ממוסגר →]
```

For `scoped` status:
```
[צור GPT Specification]   ← generates KnowledgeItem, then enable advance
```

### 2. Project Form — Structured Draft Section

New section "פרטי טיוטה" in ProjectForm, visible at top when `status = 'draft'` or when creating new project.

Fields in this section: `idea`, `target_audience`, `data_storage_type`, `platform_type`, `reason`

Required fields show a red asterisk. Form does NOT block save — only status transition is blocked.

New projects are created with `status = 'draft'` by default (not selectable on create form).

### 3. Task Form — Type-Aware Fields

- Type selector at top: משימה / פיצ'ר / באג (task / feature / bug)
- Default: `task` (existing behavior preserved)
- Feature type shows: `user_value`, `acceptance_criteria`, `scope`
- Bug type shows: `severity`, `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `environment`
- Task type shows: existing fields only

### 4. Kanban — Lifecycle Columns

Replace current status-based columns with lifecycle columns:

| Column | Statuses included |
|--------|------------------|
| טיוטה | draft |
| ממוסגר | scoped |
| הגדרת GPT | gpt_setup |
| מוכן לפיתוח | ready_for_development |
| בפיתוח | in_development |
| בבדיקה | testing |
| מוצב | deployed |
| פעיל | active |
| חסום | blocked |
| הושלם / נדחה | completed, deferred |
| ארכיון | archived |

Cards in `draft` column show a blocker count badge: "4 שדות חסרים."
Drag to next column is blocked if transition gate is not satisfied — shows a toast with the blockers list.

### 5. Sidebar — Governance Alerts

Three new alert sections (after existing "Docs Missing"):
- **GPT חסר** — projects in `gpt_setup` with missing `assigned_gpt` or `gpt_role`
- **מסמכים חסרים** — projects in `ready_for_development` or `in_development` missing required docs (already partially implemented)
- **שדות טיוטה חסרים** — projects in `draft` with incomplete required fields

---

## Implementation Phases

### Phase 1 — Data Model + Validation Engine
**Files changed:** `types/entities.ts`, `data/db/client.ts`, new `lib/workflow/governance.ts`

- Add all new types: `DataStorageType`, `PlatformType`, `TaskType`, `TaskScope`, `BugSeverity`
- Add new Project fields (10)
- Add new Task fields (9)
- Add `gpt_specification` to `DocRole`
- Extend `ProjectStatus` with new values
- Dexie version 4 → 5, migration callback (idea → draft)
- Create `lib/workflow/governance.ts` with pure validation functions
- Seed data: replace any `idea` status projects with `draft`
- TypeScript: `npx tsc --noEmit` → 0 errors
- Build: `npx next build`
- Commit: `feat: workflow governance — data model and validation engine`

### Phase 2 — Project Form + Draft Enforcement
**Files changed:** `features/projects/components/ProjectForm.tsx`

- Add "פרטי טיוטה" section with 5 new fields
- New project default status = `draft`
- Required field indicators
- `data_storage_type` and `platform_type` selects (Hebrew labels)
- TypeScript → build → commit

### Phase 3 — GPT Specification Generation
**Files changed:** `features/projects/components/ProjectDetailPage.tsx`, possibly a new `lib/workflow/gptspec.ts`

- Workflow Progress Panel in Project Detail
- Blockers checklist (computed from `getDraftCompletionStatus`)
- "Advance to next stage" button (calls `getTransitionBlockers`, shows errors or advances)
- "Generate GPT Specification" button (scoped status only)
- Template generation logic
- TypeScript → build → commit

### Phase 4 — GPT Setup Tracking
**Files changed:** `features/projects/components/ProjectForm.tsx`, `features/projects/components/ProjectDetailPage.tsx`

- GPT Setup section in ProjectForm: `gpt_url`, `gpt_role`, `knowledge_uploaded`, `uploaded_knowledge_files`
- GPT Setup display panel in ProjectDetailPage (below Execution Context)
- Progress panel shows GPT Setup blockers when status = `gpt_setup`
- TypeScript → build → commit

### Phase 5 — Knowledge Readiness Enforcement
**Files changed:** `features/projects/components/ProjectDetailPage.tsx`, `components/layout/Sidebar.tsx`

- Progress panel shows required doc checklist per current status
- Sidebar: GPT חסר + שדות טיוטה חסרים sections
- Documentation Health checklist already exists — integrate with transition gate display
- TypeScript → build → commit

### Phase 6 — Task Type: Task / Feature / Bug
**Files changed:** `features/tasks/components/TaskForm.tsx`, `features/tasks/components/TaskRow.tsx`, task-related pages

- Type selector in TaskForm
- Conditional fields per type
- Bug severity badge in TaskRow
- Feature scope label in TaskRow
- Feature acceptance_criteria used in `in_development → testing` gate
- TypeScript → build → commit

### Phase 7 — Kanban Lifecycle Governance
**Files changed:** `features/projects/components/ProjectsKanban.tsx` (or equivalent)

- New columns matching lifecycle stages
- Blocker count badges on draft cards
- Drag validation using `getTransitionBlockers`
- Toast feedback on blocked drag
- TypeScript → build → commit

After each phase: update `WORKFLOW_GOVERNANCE_CHANGELOG.md`.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Status rename `idea → draft` corrupts data | None | Dexie upgrade() callback handles atomically |
| New fields break existing Project records | None | All optional — existing records get `undefined` |
| Existing `active` projects hit new gates | None | Gates only fire on **explicit transition**, not on load |
| Task new fields collide with existing notes | None | New fields are additive |
| Kanban column explosion (11 columns) | Low | Collapse empty columns; archived/completed grouped |
| GPT Specification generation partially fills template | Intentional | Template uses `[ממתין למילוי]` for unfilled sections |
| `governance.ts` pure functions stay in sync with DB schema | Low | Functions import directly from `types/entities.ts` |

---

## Decision

**This proposal is low-risk and fully additive.**

Conditions for auto-proceeding:
- No data loss risk — confirmed
- No architecture rewrite required — confirmed
- No new workflow engine needed — confirmed
- Migration is safe — confirmed (Dexie upgrade callback + additive fields)

**Proceeding with implementation, Phase 1 first.**
