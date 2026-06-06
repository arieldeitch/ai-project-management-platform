# Governance Model Proposal
**Date:** 2026-06-06
**Status:** Proposal — no code changes made
**Scope:** Project Execution Context · Task Execution Path · Knowledge Progress Tracking

---

## Problem

The current data model captures **what** exists (name, status, priority, next action) but not
**how work happens**. When picking up a project, a practitioner must reconstruct from memory:

- Which AI assistant is assigned to this?
- What's the repo? Where's the local folder?
- Is there a Vercel URL? A Lovable URL?
- What documentation exists vs what's missing?
- What context does a task require before starting?

This creates friction on every session start and makes projects non-recoverable without
out-of-band notes (email threads, local text files, desktop folders).

---

## Current Data Model Summary

### Project — 12 fields
```
id, name, description, status, priority, next_action
domain?, goal?, current_phase?, blocked_reason?
created_at, updated_at
```

**Gaps:** No URLs, no workspace/tool assignment, no execution path, no repository link.

### Task — 8 fields
```
id, project_id, title, status, priority
notes, blocked_reason
created_at, updated_at
```

**Gaps:** No assigned AI, no structured execution context, no knowledge linkage.

### KnowledgeItem — 7 fields
```
id, project_id, title, item_type (note|reference|learning|process|research)
body, source_url
created_at, updated_at
```

**Gaps:** No document role (is this a handoff doc? a blueprint?), no freshness status
(current vs outdated). Can't answer "is the handoff document written for this project?"

---

## Proposal 1: Project Execution Context

### Proposed new optional fields on `Project`

| Field | Type | Purpose |
|---|---|---|
| `assigned_gpt` | `string` | Which AI assistant owns this project (e.g. "Claude Sonnet", "GPT-4o", "Lovable") |
| `primary_workspace` | `string` | Where work happens (e.g. "Claude Code", "Cursor", "Lovable Canvas") |
| `repository_url` | `string` | Full GitHub/GitLab URL |
| `github_project_name` | `string` | Repo shortname (e.g. "arieldeitch/ai-project-management-platform") |
| `local_folder_path` | `string` | Local disk path (e.g. "C:/Users/user/Desktop/AI/platform") |
| `production_url` | `string` | Live deployment URL |
| `lovable_url` | `string` | Lovable.app canvas URL |
| `vercel_url` | `string` | Vercel deployment URL (distinct from production if using custom domain) |
| `current_execution_path` | `string` | Free text — the active working session description |

All 9 fields are `string | undefined` — fully optional. No required fields added.

### Example
```json
{
  "name": "AI Project Management Platform",
  "assigned_gpt": "Claude Sonnet (Claude Code)",
  "primary_workspace": "Claude Code CLI",
  "repository_url": "https://github.com/arieldeitch/ai-project-management-platform",
  "github_project_name": "arieldeitch/ai-project-management-platform",
  "local_folder_path": "C:/Users/user/Desktop/AI/ניהול פרויקטים/platform",
  "production_url": "https://ai-pm.vercel.app",
  "lovable_url": "https://indigo-zen-canvas.lovable.app",
  "vercel_url": "https://ai-pm.vercel.app",
  "current_execution_path": "Completing UI Pass #4, preparing for Vercel deployment"
}
```

---

## Proposal 2: Task Execution Path

### Assessment

The requested Task fields:

| Requested field | Assessment |
|---|---|
| `linked_project` | **Already exists** — `project_id` |
| `execution_path` | **Recommend: keep in `notes`** — free text, not structured |
| `assigned_gpt` | **Add as string** — high value, low cost |
| `required_context` | **Recommend: keep in `notes`** — this is a prompt, not a field |
| `expected_output` | **Recommend: keep in `notes`** — this is a prompt, not a field |
| `repo_impact` | **Recommend: keep in `notes`** — varies too much to be a field |
| `knowledge_required` | **Omit** — link via project knowledge tab instead |
| `knowledge_to_update` | **Omit** — link via project knowledge tab instead |

**Rationale:** `required_context`, `expected_output`, `repo_impact`, `knowledge_required`,
`knowledge_to_update` are AI session setup notes, not database fields. Structuring them
adds 5 new fields that a solo practitioner would fill with free text anyway. The existing
`notes` field already holds this content without schema overhead.

**Recommendation:** Add only one new Task field:

| Field | Type | Purpose |
|---|---|---|
| `assigned_gpt` | `string \| undefined` | Which AI assistant handles this task |

Everything else stays in `notes`. Notes format can be a personal convention:
```
Context: Using Claude Code in platform/ directory
Output: Working TypeScript component
Repo: affects features/projects/
```

---

## Proposal 3: Knowledge Progress Tracking

### Problem
Currently `item_type` identifies knowledge as `note | reference | learning | process | research`.
It does not identify WHICH document role it fills (is this the handoff doc? the blueprint?).
There's no way to ask "does this project have a deployment report?"

### Proposed approach: extend KnowledgeItem with two new fields

| Field | Type | Values |
|---|---|---|
| `doc_role` | `string \| undefined` | See table below — identifies what this document IS |
| `doc_status` | `string \| undefined` | `'draft' \| 'current' \| 'outdated'` |

**`doc_role` values:**
```
handoff_document
implementation_blueprint
ux_notes
decisions_log
execution_board
release_notes
deployment_report
recovery_report
```

Items without `doc_role` are regular knowledge entries (notes, references, etc.) — unaffected.

**Documentation Progress computation:**
For a given project, the 8 known doc roles are checked. Status is:
- **Missing** — no KnowledgeItem with that `doc_role` linked to this project
- **Draft** — item exists with `doc_status === 'draft'`
- **Current** — item exists with `doc_status === 'current'`
- **Outdated** — item exists with `doc_status === 'outdated'`

This requires no new entity, no new table, and no new repository. The existing
`KnowledgeRepository.findByProject(id)` query returns items with `doc_role` set.

### Alternative considered: separate `ProjectDocument` entity

Would need: new Dexie table, new repository, new store, new CRUD forms, new routes.
Rejected — too much infrastructure for a solo practitioner tool.

---

## What This Requires

| Change | Required for Proposal 1 | Required for Proposal 2 | Required for Proposal 3 |
|---|---|---|---|
| New fields on `Project` entity | ✓ 9 fields | — | — |
| New fields on `Task` entity | — | ✓ 1 field | — |
| New fields on `KnowledgeItem` entity | — | — | ✓ 2 fields |
| Dexie schema version bump | ✓ | ✓ | ✓ |
| Repository changes | ✓ (update ProjectsRepository) | ✓ (update TasksRepository) | ✓ (update KnowledgeRepository) |
| Store changes | ✗ (stores pass through Partial updates) | ✗ | ✗ |
| New routes | ✗ | ✗ | ✗ |
| Edit form changes | ✓ (ProjectEditPage — 9 new fields) | ✓ (TaskForm — 1 field) | ✓ (KnowledgeEditPage — 2 fields) |
| Detail page UI | ✓ (Execution Context panel) | ✓ (Task context display) | ✓ (Doc Progress checklist) |
| Seed data updates | Optional | Optional | Optional |

---

## Migration Impact

**IndexedDB / Dexie:**
- All changes are additive (new optional fields)
- Dexie schema version increment required (e.g. version 1 → 2)
- Existing records automatically get `undefined` for new fields — no data loss
- No migration scripts needed — Dexie handles version upgrades with `upgrade()` callback
- The `upgrade()` callback for additive changes is empty — new fields just don't exist on old records

**CRUD compatibility:**
- `ProjectUpdateInput = Partial<ProjectCreateInput>` already accepts any subset of fields
- New fields flow through existing `update(id, partial)` calls without store changes
- Risk: none — TypeScript will enforce new fields in CreateInput defaults

---

## UI Impact

### A. Project Detail Page — new "Execution Context" panel

Added as a collapsible section in the right meta panel, below the existing Phase/Created/Updated rows.

```
┌─ Execution Context ──────────────────────────┐
│  GPT          Claude Sonnet (Claude Code)     │
│  Workspace    Claude Code CLI                 │
│  Repository   arieldeitch/ai-pm-platform      │ → links to GitHub
│  Local Path   C:/Users/.../platform           │
│  Production   https://ai-pm.vercel.app        │ → opens URL
│  Lovable      https://...lovable.app          │ → opens URL
│  Exec Path    Completing UI Pass #4           │
└──────────────────────────────────────────────┘
```

- URL fields render as clickable external links when set
- Path fields render as copy-to-clipboard when set
- All inline-editable (reusing existing `InlineText` component)
- Collapsed by default when all fields empty; expands on click

### B. Task — minimal execution context display

No new panel. Single field in TaskForm:
```
Assigned GPT: [text input — optional]
```

Rendered in TaskRow as a small label next to the task title when set.

### C. Project Detail Knowledge Tab — Documentation Progress checklist

Added at the top of the Knowledge tab, above the list of knowledge items.

```
Documentation Progress
──────────────────────────────────────────────
□ Handoff Document           Missing
□ Implementation Blueprint   Missing  
✓ UX Notes                   Current
○ Decisions Log              Draft
□ Execution Board            Missing
✓ Release Notes              Current
□ Deployment Report          Missing
□ Recovery Report            Missing
```

- Clicking a Missing item opens "Add knowledge" with `doc_role` pre-filled
- Clicking an existing item navigates to that KnowledgeItem
- Status colors: Missing=muted, Draft=amber, Current=emerald, Outdated=red

### D. Sidebar Command Center — missing docs alert

Below "Blocked" section, add a "Docs Missing" section that surfaces active projects
missing critical documents (handoff_document or implementation_blueprint).

```
DOCS MISSING
India Returns App
  Missing: handoff, blueprint
Task Mgmt Platform
  Missing: deployment report
```

Rendered only when active projects are missing critical doc types.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Dexie version bump breaks existing data | Low | Additive changes don't affect existing records; Dexie handles gracefully |
| Too many Project fields crowd the edit form | Medium | Group in a collapsible "Execution Context" section; all optional |
| `doc_role` enum gets stale over time | Low | String type (not TypeScript union) — new roles can be added without migration |
| Task `assigned_gpt` adds form complexity | Low | Single optional text field; default empty |
| Over-fetching: sidebar calls load() on every page | Existing issue | Already present from UI Pass #4; not introduced here |

---

## Recommended Implementation Phases

### Phase 1 — Project Execution Context (highest value, moderate effort)

**Scope:**
- Add 9 optional fields to `Project` entity
- Dexie schema version bump
- `ProjectsRepository` update
- `ProjectEditPage` — add Execution Context fieldset (collapsible, all optional)
- `ProjectDetailPage` — add Execution Context display panel in meta sidebar

**Effort estimate:** ~3–4 hours
**Value:** Every project becomes immediately recoverable. Session startup time drops.

---

### Phase 2 — Knowledge Documentation Progress (medium value, low effort)

**Scope:**
- Add `doc_role` and `doc_status` to `KnowledgeItem` entity
- Dexie schema version bump
- `KnowledgeRepository` update
- `KnowledgeEditPage` / `KnowledgeForm` — add two optional dropdowns
- `ProjectDetailPage` Knowledge tab — add Documentation Progress checklist
- Sidebar Command Center — add "Docs Missing" section

**Effort estimate:** ~2–3 hours
**Value:** Documentation gaps become visible per-project without manual tracking.

---

### Phase 3 — Task Assigned GPT (low value, low effort)

**Scope:**
- Add `assigned_gpt?: string` to `Task` entity
- Dexie schema version bump
- `TasksRepository` update
- `TaskForm` — one new optional text field
- `TaskRow` — render assigned GPT as a small label when set

**Effort estimate:** ~1 hour
**Value:** Marginal. Useful only if tasks are delegated to different AI assistants.
Consider deferring until there's a concrete use case.

---

## Not Recommended

The following were considered and rejected:

| Rejected item | Reason |
|---|---|
| Structured `required_context`, `expected_output`, `repo_impact` fields on Task | Free-text in `notes` covers these at zero schema cost |
| `knowledge_required` / `knowledge_to_update` as Task fields | Covered by the project's Knowledge tab relationship |
| Separate `ProjectDocument` entity | Duplicates KnowledgeItem with extra schema overhead |
| Permissions / workflow engine | Out of scope for solo practitioner tool |
| Mandatory (non-optional) new fields | Would require backfilling 23 existing projects |

---

## Decision Required

Before implementation, confirm:

1. **Phase 1 approved?** — Project Execution Context (9 fields)
2. **Phase 2 approved?** — Knowledge Progress (doc_role + doc_status on KnowledgeItem)
3. **Phase 3 approved?** — Task assigned_gpt (1 field)
4. **Task structured fields rejected?** — execution_path, required_context, expected_output, repo_impact, knowledge_required, knowledge_to_update stay in notes
5. **Separate ProjectDocument entity rejected?** — use KnowledgeItem with doc_role instead

Awaiting approval before any code changes.
