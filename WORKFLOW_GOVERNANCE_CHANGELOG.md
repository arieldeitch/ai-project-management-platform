# Workflow Governance Changelog

## Phase 1 — Data Model + Validation Engine
**Date:** 2026-06-06
**Commit:** (pending)
**Build:** ✓ 21 routes | `npx tsc --noEmit` → 0 errors

### Changes

#### `types/entities.ts`
- `ProjectStatus`: removed `'idea'`, added `'draft' | 'gpt_setup' | 'ready_for_development' | 'in_development' | 'testing' | 'deployed'`
- New types: `DataStorageType`, `PlatformType`, `TaskType`, `TaskScope`, `BugSeverity`
- `DocRole`: added `'gpt_specification'`
- `Project`: added 10 new optional fields — `idea`, `target_audience`, `data_storage_type`, `platform_type`, `reason`, `gpt_url`, `gpt_role`, `knowledge_uploaded`, `uploaded_knowledge_files`, `deployment_not_applicable`
- `Task`: added 9 new optional fields — `task_type`, `user_value`, `acceptance_criteria`, `scope`, `severity`, `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `environment`

#### `data/db/client.ts`
- Dexie schema version 4 → 5 (additive)
- New indexes: `data_storage_type`, `platform_type` on `projects`; `task_type` on `tasks`
- Migration callback: all `status === 'idea'` records renamed to `'draft'`

#### `lib/constants/statuses.ts`
- `STATUS_CONFIG`: updated all labels to Hebrew lifecycle names, added 6 new statuses
- `STATUS_ORDER`: updated for new lifecycle
- `LIFECYCLE_STAGES`: new export — ordered list of the 8 lifecycle stages

#### `lib/workflow/governance.ts` (new)
- `getDraftFieldChecks(project)` — returns per-field completion status for draft requirements
- `getDraftCompletionStatus(project)` — returns `{ complete, missing }`
- `getTransitionBlockers(project, tasks, knowledgeItems, targetStatus)` — returns `TransitionBlocker[]`
- `getNextLifecycleStatus(current)` — returns next lifecycle stage or null
- `buildGptSpecBody(project)` — generates GPT Specification Markdown template

#### `data/seed.ts`
- All `status: 'idea'` → `status: 'draft'`

#### `app/projects/page.tsx`
- `VALID_STATUSES` updated with all 12 lifecycle stages

#### `features/dashboard/components/DashboardPage.tsx`
- `ideas` filter: `'idea'` → `'draft'`; href updated to `?status=draft`

#### `features/projects/components/ProjectsListPage.tsx`
- `KANBAN_COLUMNS`: 7 columns → 12 lifecycle columns (renamed + 5 new)

#### `features/projects/components/ProjectForm.tsx`
- `STATUS_OPTIONS`: updated with all 12 statuses
- Default status on create: `'idea'` → `'draft'`

#### `features/projects/components/ProjectDetailPage.tsx`
- `STATUS_OPTIONS`: updated with all 12 statuses
- `DOC_ROLE_CONFIG`: added `gpt_specification` as critical doc

#### `features/knowledge/components/KnowledgeForm.tsx`
- `DOC_ROLE_OPTIONS`: added `gpt_specification`

#### `features/knowledge/components/KnowledgeDetailPage.tsx`
- `DOC_ROLE_LABELS`: added `gpt_specification`

#### `components/layout/Sidebar.tsx`
- `CRITICAL_DOC_ROLES`: added `gpt_specification`
- `CRITICAL_ROLE_LABELS`: added `gpt_specification` label

---

## Phase 2 — Project Form + Draft Enforcement
**Status:** Pending

## Phase 3 — Workflow Progress Panel + GPT Spec Generation
**Status:** Pending

## Phase 4 — GPT Setup Tracking UI
**Status:** Pending

## Phase 5 — Knowledge Readiness Enforcement + Sidebar Governance Alerts
**Status:** Pending

## Phase 6 — Task Type: Task / Feature / Bug
**Status:** Pending

## Phase 7 — Kanban Lifecycle Governance
**Status:** Pending
