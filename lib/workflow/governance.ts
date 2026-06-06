import type { Project, Task, KnowledgeItem, ProjectStatus, DocRole } from '@/types/entities'

/* ── Draft required fields ───────────────────────────────────── */

export interface DraftFieldCheck {
  key: keyof Project | 'priority_unset'
  label: string
  filled: boolean
}

export function getDraftFieldChecks(project: Project): DraftFieldCheck[] {
  return [
    { key: 'idea',              label: 'רעיון',             filled: !!project.idea?.trim() },
    { key: 'goal',              label: 'מטרה',              filled: !!project.goal?.trim() },
    { key: 'target_audience',   label: 'קהל יעד',           filled: !!project.target_audience?.trim() },
    { key: 'data_storage_type', label: 'סוג אחסון נתונים',  filled: !!project.data_storage_type },
    { key: 'platform_type',     label: 'פלטפורמה',          filled: !!project.platform_type },
    { key: 'project_type',      label: 'סוג פרויקט',        filled: !!project.project_type },
    { key: 'priority_unset',    label: 'עדיפות',            filled: !!project.priority && project.priority !== 'unset' },
    { key: 'reason',            label: 'סיבה לפרויקט',      filled: !!project.reason?.trim() },
    { key: 'next_action',       label: 'פעולה הבאה',        filled: !!project.next_action?.trim() },
  ]
}

export function getDraftCompletionStatus(project: Project): { complete: boolean; missing: DraftFieldCheck[] } {
  const checks = getDraftFieldChecks(project)
  const missing = checks.filter((c) => !c.filled)
  return { complete: missing.length === 0, missing }
}

/* ── Doc presence helpers ────────────────────────────────────── */

function hasDoc(items: KnowledgeItem[], projectId: string, role: DocRole): boolean {
  return items.some((k) => k.project_id === projectId && k.doc_role === role)
}

/* ── Transition blocker computation ─────────────────────────── */

export interface TransitionBlocker {
  reason: string
}

export function getTransitionBlockers(
  project: Project,
  tasks: Task[],
  knowledgeItems: KnowledgeItem[],
  targetStatus: ProjectStatus,
): TransitionBlocker[] {
  const blockers: TransitionBlocker[] = []
  const id = project.id

  if (targetStatus === 'scoped') {
    const { missing } = getDraftCompletionStatus(project)
    for (const f of missing) {
      blockers.push({ reason: `שדה חסר: ${f.label}` })
    }
  }

  if (targetStatus === 'gpt_setup') {
    if (!hasDoc(knowledgeItems, id, 'gpt_specification')) {
      blockers.push({ reason: 'מפרט GPT חסר — יש לצור מסמך GPT Specification תחילה' })
    }
  }

  if (targetStatus === 'ready_for_development') {
    if (!project.assigned_gpt?.trim()) {
      blockers.push({ reason: 'שם ה-GPT המשויך חסר' })
    }
    if (!project.gpt_role?.trim()) {
      blockers.push({ reason: 'תפקיד ה-GPT חסר' })
    }
    if (!project.knowledge_uploaded) {
      blockers.push({ reason: 'יש לאשר שקבצי Knowledge הועלו ל-GPT' })
    }
    if (!hasDoc(knowledgeItems, id, 'gpt_specification')) {
      blockers.push({ reason: 'מפרט GPT חסר' })
    }
    if (!hasDoc(knowledgeItems, id, 'handoff_document')) {
      blockers.push({ reason: 'מסמך מסירה חסר' })
    }
    if (!hasDoc(knowledgeItems, id, 'implementation_blueprint')) {
      blockers.push({ reason: 'תכנית מימוש חסרה' })
    }
  }

  if (targetStatus === 'in_development') {
    if (!project.deployment_not_applicable) {
      if (!project.repository_url?.trim() && !project.local_folder_path?.trim()) {
        blockers.push({ reason: 'נדרש repository_url או local_folder_path (או סמן "לא רלוונטי")' })
      }
    }
  }

  if (targetStatus === 'testing') {
    const projectTasks = tasks.filter((t) => t.project_id === id)
    const hasFeatureWithCriteria = projectTasks.some(
      (t) => t.task_type === 'feature' && t.acceptance_criteria?.trim(),
    )
    if (!hasFeatureWithCriteria) {
      blockers.push({ reason: 'נדרשת לפחות פיצ\'ר אחת עם קריטריוני קבלה מוגדרים' })
    }
  }

  if (targetStatus === 'deployed') {
    if (!project.deployment_not_applicable) {
      if (!project.production_url?.trim() && !project.vercel_url?.trim()) {
        blockers.push({ reason: 'נדרש production_url או vercel_url (או סמן "לא רלוונטי")' })
      }
    }
  }

  if (targetStatus === 'active') {
    if (!hasDoc(knowledgeItems, id, 'release_notes')) {
      blockers.push({ reason: 'הערות גרסה חסרות' })
    }
    if (!hasDoc(knowledgeItems, id, 'deployment_report')) {
      blockers.push({ reason: 'דו"ח פריסה חסר' })
    }
  }

  if (targetStatus === 'blocked') {
    if (!project.blocked_reason?.trim()) {
      blockers.push({ reason: 'יש להגדיר סיבת חסימה' })
    }
  }

  return blockers
}

/* ── Next allowed transition ─────────────────────────────────── */

export const LIFECYCLE_SEQUENCE: ProjectStatus[] = [
  'draft', 'scoped', 'gpt_setup', 'ready_for_development',
  'in_development', 'testing', 'deployed', 'active',
]

export function getNextLifecycleStatus(current: ProjectStatus): ProjectStatus | null {
  const idx = LIFECYCLE_SEQUENCE.indexOf(current)
  if (idx === -1 || idx === LIFECYCLE_SEQUENCE.length - 1) return null
  return LIFECYCLE_SEQUENCE[idx + 1]
}

/* ── GPT Specification template ─────────────────────────────── */

export function buildGptSpecBody(project: Project): string {
  const storageLabel: Record<string, string> = {
    local: 'מקומי', cloud: 'ענן', hybrid: 'היברידי', not_relevant: 'לא רלוונטי',
  }
  const platformLabel: Record<string, string> = {
    web: 'Web', mobile: 'Mobile', desktop: 'Desktop',
    automation: 'אוטומציה', gpt_only: 'GPT בלבד', other: 'אחר',
  }
  const priorityLabel: Record<string, string> = {
    critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך', unset: 'לא נקבע',
  }

  return `# מפרט GPT — ${project.name}

## פרטי הפרויקט
- **שם:** ${project.name}
- **רעיון:** ${project.idea ?? '[ממתין למילוי]'}
- **מטרה:** ${project.goal ?? '[ממתין למילוי]'}
- **קהל יעד:** ${project.target_audience ?? '[ממתין למילוי]'}
- **סוג אחסון נתונים:** ${project.data_storage_type ? storageLabel[project.data_storage_type] ?? project.data_storage_type : '[ממתין למילוי]'}
- **פלטפורמה:** ${project.platform_type ? platformLabel[project.platform_type] ?? project.platform_type : '[ממתין למילוי]'}
- **סוג פרויקט:** ${project.project_type ?? '[ממתין למילוי]'}
- **עדיפות:** ${priorityLabel[project.priority] ?? project.priority}
- **הסיבה לפרויקט:** ${project.reason ?? '[ממתין למילוי]'}

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
- [ ] מסמך מסירה (Handoff Document)
- [ ] תכנית מימוש (Implementation Blueprint)
- [ ] הערות UX

## שאלות פתוחות
[ממתין למילוי]
`
}
