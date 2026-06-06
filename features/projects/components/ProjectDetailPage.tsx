'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { useTasksStore } from '@/store/tasks.store'
import { useKnowledgeStore } from '@/store/knowledge.store'
import { AssetsRepository } from '@/data/repositories/assets.repository'
import { DecisionsRepository } from '@/data/repositories/decisions.repository'
import { KnowledgeRepository } from '@/data/repositories/knowledge.repository'
import {
  getDraftFieldChecks,
  getTransitionBlockers,
  getNextLifecycleStatus,
  buildGptSpecBody,
  LIFECYCLE_SEQUENCE,
} from '@/lib/workflow/governance'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { DomainBadge } from '@/components/shared/DomainBadge'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { TaskForm } from '@/features/tasks/components/TaskForm'
import { TopBar } from '@/components/layout/TopBar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, MoreHorizontal, Archive, Trash2, Loader2, AlertTriangle, Target,
  Plus, Check, X, Bot, BookOpen, FileText, ExternalLink, Pencil,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type {
  Project, Task, ProjectStatus, ProjectPriority, ProjectDomain, ProjectType,
  DocRole, DocStatus,
  AIAsset, Decision, KnowledgeItem,
} from '@/types/entities'

/* ── constants ─────────────────────────────────────────────── */

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft',                 label: 'טיוטה' },
  { value: 'scoped',                label: 'ממוסגר' },
  { value: 'gpt_setup',             label: 'הגדרת GPT' },
  { value: 'ready_for_development', label: 'מוכן לפיתוח' },
  { value: 'in_development',        label: 'בפיתוח' },
  { value: 'testing',               label: 'בבדיקה' },
  { value: 'deployed',              label: 'מוצב' },
  { value: 'active',                label: 'פעיל' },
  { value: 'blocked',               label: 'חסום' },
  { value: 'completed',             label: 'הושלם' },
  { value: 'deferred',              label: 'נדחה' },
  { value: 'archived',              label: 'בארכיון' },
]

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'critical', label: 'קריטי' },
  { value: 'high',     label: 'גבוה' },
  { value: 'medium',   label: 'בינוני' },
  { value: 'low',      label: 'נמוך' },
  { value: 'unset',    label: 'ללא עדיפות' },
]

const DOMAIN_OPTIONS: { value: ProjectDomain; label: string }[] = [
  { value: 'personal', label: 'אישי' },
  { value: 'work',     label: 'עבודה' },
  { value: 'general',  label: 'כללי' },
]

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'software',       label: 'תוכנה' },
  { value: 'ai_agent',       label: 'סוכן AI' },
  { value: 'automation',     label: 'אוטומציה' },
  { value: 'operations',     label: 'תפעול' },
  { value: 'research',       label: 'מחקר' },
  { value: 'personal',       label: 'אישי' },
  { value: 'infrastructure', label: 'תשתיות' },
]

const DOC_ROLE_CONFIG: { role: DocRole; label: string; critical: boolean }[] = [
  { role: 'gpt_specification',        label: 'מפרט GPT',       critical: true },
  { role: 'handoff_document',         label: 'מסמך מסירה',     critical: true },
  { role: 'implementation_blueprint', label: 'תכנית מימוש',    critical: true },
  { role: 'ux_notes',                 label: 'הערות UX',       critical: false },
  { role: 'decisions_log',            label: 'יומן החלטות',    critical: false },
  { role: 'execution_board',          label: 'לוח ביצוע',      critical: false },
  { role: 'release_notes',            label: 'הערות גרסה',     critical: false },
  { role: 'deployment_report',        label: 'דו"ח פריסה',     critical: false },
  { role: 'recovery_report',          label: 'דו"ח שחזור',     critical: false },
]

const DOC_STATUS_STYLE: Record<DocStatus, string> = {
  current:  'bg-emerald-50 text-emerald-700',
  draft:    'bg-amber-50 text-amber-700',
  outdated: 'bg-red-50 text-red-700',
}

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  current:  'עדכני',
  draft:    'טיוטה',
  outdated: 'ישן',
}

/* ── inline editable field ─────────────────────────────────── */

function InlineText({
  value,
  placeholder,
  onSave,
  multiline,
  className,
}: {
  value: string
  placeholder: string
  onSave: (v: string) => void
  multiline?: boolean
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    onSave(draft)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  if (editing) {
    const sharedProps = {
      ref: inputRef as never,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') cancel()
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
        if (e.key === 'Enter' && e.metaKey) commit()
      },
      className: cn('w-full text-sm', className),
    }

    return (
      <div className="space-y-1.5">
        {multiline
          ? <Textarea {...sharedProps} rows={3} />
          : <Input {...sharedProps} />
        }
        <div className="flex gap-1.5">
          <Button size="sm" onClick={commit} className="h-6 px-2 text-xs">
            <Check className="me-1 h-3 w-3" /> שמור
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="h-6 px-2 text-xs">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className={cn(
        'group flex w-full items-baseline gap-1.5 rounded px-1 py-0.5 text-start text-sm transition-colors hover:bg-muted/60',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      <span className="flex-1 border-b border-dashed border-muted-foreground/25 pb-0.5 transition-colors group-hover:border-muted-foreground/50">
        {value || placeholder}
      </span>
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-25 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

/* ── InlineUrl ─────────────────────────────────────────────── */

function InlineUrl({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <div className="flex-1 min-w-0">
        <InlineText value={value} placeholder={placeholder} onSave={onSave} />
      </div>
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary transition-colors"
          title="פתח בדפדפן"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

/* ── meta row ──────────────────────────────────────────────── */

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-3 last:border-0">
      <span className="w-24 shrink-0 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

/* ── ExecRow ───────────────────────────────────────────────── */

function ExecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="w-20 shrink-0 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

/* ── WorkflowProgressPanel ─────────────────────────────────── */

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'טיוטה', scoped: 'ממוסגר', gpt_setup: 'הגדרת GPT',
  ready_for_development: 'מוכן לפיתוח', in_development: 'בפיתוח',
  testing: 'בבדיקה', deployed: 'מוצב', active: 'פעיל',
}

interface WorkflowProgressPanelProps {
  project: Project
  tasks: Task[]
  knowledgeItems: KnowledgeItem[]
  onAdvance: (status: ProjectStatus) => void
  onGenerateGptSpec: () => void
  generatingSpec: boolean
  blockerError: string[] | null
  onClearError: () => void
}

function WorkflowProgressPanel({
  project, tasks, knowledgeItems, onAdvance, onGenerateGptSpec,
  generatingSpec, blockerError, onClearError,
}: WorkflowProgressPanelProps) {
  const inLifecycle = LIFECYCLE_SEQUENCE.includes(project.status as typeof LIFECYCLE_SEQUENCE[number])
  if (!inLifecycle) return null

  const nextStatus = getNextLifecycleStatus(project.status)
  const blockers = nextStatus
    ? getTransitionBlockers(project, tasks, knowledgeItems, nextStatus)
    : []

  const hasGptSpec = knowledgeItems.some(
    (k) => k.project_id === project.id && k.doc_role === 'gpt_specification'
  )

  const draftChecks = project.status === 'draft' || project.status === 'scoped'
    ? getDraftFieldChecks(project)
    : []

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          מצב תהליך
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {LIFECYCLE_LABELS[project.status] ?? project.status}
        </span>
      </div>

      <div className="px-4 pb-3 pt-2 space-y-3">

        {/* Draft field checklist */}
        {draftChecks.length > 0 && (
          <div className="space-y-1">
            {draftChecks.map((c) => (
              <div key={String(c.key)} className="flex items-center gap-1.5">
                <span className={cn(
                  'h-3 w-3 shrink-0 rounded-full flex items-center justify-center',
                  c.filled ? 'bg-emerald-100 text-emerald-600' : 'bg-muted'
                )}>
                  {c.filled
                    ? <Check className="h-2 w-2" />
                    : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  }
                </span>
                <span className={cn(
                  'text-xs',
                  c.filled ? 'text-muted-foreground line-through' : 'text-foreground'
                )}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* GPT Spec generation */}
        {project.status === 'scoped' && !hasGptSpec && (
          <button
            onClick={onGenerateGptSpec}
            disabled={generatingSpec}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5',
              generatingSpec && 'opacity-50 cursor-not-allowed'
            )}
          >
            {generatingSpec
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Plus className="h-3 w-3" />
            }
            {generatingSpec ? 'יוצר מפרט GPT...' : 'צור מפרט GPT'}
          </button>
        )}

        {/* Transition blockers */}
        {nextStatus && blockers.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              לקידום ל-{LIFECYCLE_LABELS[nextStatus] ?? nextStatus}:
            </p>
            {blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="text-xs text-amber-700 dark:text-amber-400">{b.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Advance button */}
        {nextStatus && blockers.length === 0 && (
          <button
            onClick={() => onAdvance(nextStatus)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            קדם ל: {LIFECYCLE_LABELS[nextStatus] ?? nextStatus} →
          </button>
        )}

        {/* External blocker error (from status dropdown) */}
        {blockerError && (
          <div className="rounded-md border border-red-200 bg-red-50/50 p-2 dark:border-red-900/30 dark:bg-red-950/10">
            <div className="flex items-start justify-between gap-1">
              <p className="text-[11px] font-medium text-red-700 dark:text-red-400">לא ניתן לשנות סטטוס:</p>
              <button onClick={onClearError} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            {blockerError.map((r, i) => (
              <p key={i} className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">• {r}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── main component ────────────────────────────────────────── */

interface ProjectDetailPageProps {
  projectId: string
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const router = useRouter()
  const { projects, isLoading, load, update, remove } = useProjectsStore()
  const { tasks, loadByProject } = useTasksStore()
  const { create: createKnowledge } = useKnowledgeStore()
  const [deleteOpen,      setDeleteOpen]     = useState(false)
  const [deleting,        setDeleting]       = useState(false)
  const [statusChanging,  setStatusChanging] = useState(false)
  const [generatingSpec,  setGeneratingSpec] = useState(false)
  const [blockerError,    setBlockerError]   = useState<string[] | null>(null)
  const [tab,             setTab]            = useState('overview')
  const [showTaskForm,    setShowTaskForm]   = useState(false)
  const [execContextOpen, setExecContextOpen] = useState(false)

  const [projectAssets,    setProjectAssets]    = useState<AIAsset[]>([])
  const [projectDecisions, setProjectDecisions] = useState<Decision[]>([])
  const [projectKnowledge, setProjectKnowledge] = useState<KnowledgeItem[]>([])

  useEffect(() => { if (projects.length === 0) load() }, [projects.length, load])

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (project) {
      const hasData = !!(
        project.assigned_gpt || project.primary_workspace || project.repository_url ||
        project.local_folder_path || project.production_url
      )
      setExecContextOpen(hasData)
    }
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'tasks' && project) loadByProject(project.id)
  }, [tab, project, loadByProject])

  useEffect(() => {
    if (tab === 'assets' && project) AssetsRepository.findByProject(project.id).then(setProjectAssets)
  }, [tab, project])

  useEffect(() => {
    if (tab === 'decisions' && project) DecisionsRepository.findByProject(project.id).then(setProjectDecisions)
  }, [tab, project])

  useEffect(() => {
    if (project) KnowledgeRepository.findByProject(project.id).then(setProjectKnowledge)
  }, [project?.id, tab])

  const projectTasks = tasks.filter((t) => t.project_id === projectId)

  /* ── handlers ─────────────────────────────────────────────── */

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || statusChanging) return
    const blockers = getTransitionBlockers(project, projectTasks, projectKnowledge, newStatus)
    if (blockers.length > 0) {
      setBlockerError(blockers.map((b) => b.reason))
      return
    }
    setBlockerError(null)
    setStatusChanging(true)
    try {
      await update(project.id, {
        status: newStatus,
        blocked_reason: newStatus !== 'blocked' ? '' : project.blocked_reason,
      })
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleGenerateGptSpec() {
    if (!project || generatingSpec) return
    setGeneratingSpec(true)
    try {
      await createKnowledge({
        title: `מפרט GPT — ${project.name}`,
        body: buildGptSpecBody(project),
        item_type: 'process',
        project_id: project.id,
        doc_role: 'gpt_specification',
        doc_status: 'current',
        source_url: '',
      })
      await KnowledgeRepository.findByProject(project.id).then(setProjectKnowledge)
    } finally {
      setGeneratingSpec(false)
    }
  }

  async function handleFieldSave(field: keyof Project, value: string) {
    if (!project) return
    await update(project.id, { [field]: value } as never)
  }

  async function handleProjectType(v: string) {
    if (!project) return
    await update(project.id, { project_type: v ? (v as ProjectType) : undefined })
  }

  async function handleArchive() {
    if (!project) return
    await update(project.id, { status: 'archived' })
    router.push('/projects')
  }

  async function handleDelete() {
    if (!project) return
    setDeleting(true)
    try {
      await remove(project.id)
      router.push('/projects')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  /* ── render ───────────────────────────────────────────────── */

  if (isLoading && projects.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">טוען...</div>
  }

  if (!project) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="פרויקט לא נמצא" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">פרויקט זה אינו קיים.</p>
          <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
            חזרה לפרויקטים
          </Link>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'overview',  label: 'סקירה' },
    { id: 'tasks',     label: `משימות${projectTasks.length > 0 ? ` (${projectTasks.length})` : ''}` },
    { id: 'assets',    label: `נכסי AI${projectAssets.length > 0 ? ` (${projectAssets.length})` : ''}` },
    { id: 'decisions', label: `החלטות${projectDecisions.length > 0 ? ` (${projectDecisions.length})` : ''}` },
    { id: 'knowledge', label: `ידע${projectKnowledge.length > 0 ? ` (${projectKnowledge.length})` : ''}` },
  ]

  const openTasks    = projectTasks.filter((t) => t.status !== 'done')
  const blockedTasks = projectTasks.filter((t) => t.status === 'blocked')
  const doneTasks    = projectTasks.filter((t) => t.status === 'done')

  const hasExecData = !!(
    project.assigned_gpt || project.primary_workspace || project.repository_url ||
    project.github_project_name || project.local_folder_path || project.production_url ||
    project.lovable_url || project.vercel_url || project.current_execution_path
  )

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={
            <span className="flex items-center gap-1.5 text-sm">
              <Link href="/projects" className="font-normal text-muted-foreground hover:text-foreground transition-colors">
                פרויקטים
              </Link>
              <span className="text-muted-foreground/50 select-none">/</span>
              <span className="font-semibold text-foreground">{project.name}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${project.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                ערוך הכל
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                  aria-label="אפשרויות נוספות"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleArchive} disabled={project.status === 'archived'}>
                    <Archive className="me-2 h-4 w-4" />
                    ארכיון
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/projects" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
                פרויקטים
              </Link>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border bg-background px-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* Main content */}
              <div className="space-y-6 lg:col-span-2">

                {/* Blocked banner */}
                {project.status === 'blocked' && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">חסום</p>
                      <InlineText
                        value={project.blocked_reason ?? ''}
                        placeholder="לחץ להוספת סיבת חסימה..."
                        onSave={(v) => handleFieldSave('blocked_reason', v)}
                        className="text-red-600/80 dark:text-red-400/80"
                      />
                    </div>
                  </div>
                )}

                {tab === 'overview' && (
                  <>
                    {/* Goal */}
                    <section>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">מטרה</h2>
                      </div>
                      <InlineText
                        value={project.goal ?? ''}
                        placeholder="לחץ להוספת מטרה או יעד..."
                        onSave={(v) => handleFieldSave('goal', v)}
                        className="font-medium text-foreground"
                      />
                    </section>

                    {/* Next action */}
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        פעולה הבאה
                      </h2>
                      <InlineText
                        value={project.next_action ?? ''}
                        placeholder="לחץ להוספת הצעד הבא המיידי..."
                        onSave={(v) => handleFieldSave('next_action', v)}
                      />
                    </section>

                    {/* Description */}
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        תיאור
                      </h2>
                      <InlineText
                        value={project.description ?? ''}
                        placeholder="לחץ להוספת תיאור..."
                        onSave={(v) => handleFieldSave('description', v)}
                        multiline
                      />
                    </section>
                  </>
                )}

                {tab === 'tasks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {blockedTasks.length > 0 && (
                          <span className="text-red-500">{blockedTasks.length} חסומות</span>
                        )}
                        <span>{openTasks.length} פתוחות</span>
                        {doneTasks.length > 0 && (
                          <span className="text-muted-foreground">{doneTasks.length} הושלמו</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setShowTaskForm(true)}>
                        <Plus className="me-1.5 h-3.5 w-3.5" />
                        הוסף משימה
                      </Button>
                    </div>

                    {showTaskForm && (
                      <div className="rounded-lg border border-border bg-card p-4">
                        <TaskForm
                          projectId={projectId}
                          onClose={() => setShowTaskForm(false)}
                        />
                      </div>
                    )}

                    {projectTasks.length === 0 && !showTaskForm ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <p className="text-sm text-muted-foreground">אין משימות עדיין.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => setShowTaskForm(true)}
                        >
                          <Plus className="me-1.5 h-3.5 w-3.5" />
                          הוסף משימה ראשונה
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-card overflow-hidden">
                        {projectTasks.map((t) => (
                          <TaskRow key={t.id} task={t} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'assets' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {projectAssets.length} נכסים מקושרים
                      </span>
                      <Link
                        href="/assets/new"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Plus className="me-1.5 h-3.5 w-3.5" />
                        נכס חדש
                      </Link>
                    </div>
                    {projectAssets.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <Bot className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">אין נכסים מקושרים עדיין.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          צור נכס ולאחר מכן קשר אותו לפרויקט זה מדף פרטי הנכס.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                        {projectAssets.map((asset) => (
                          <Link
                            key={asset.id}
                            href={`/assets/${asset.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                          >
                            <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{asset.name}</p>
                              {asset.description && (
                                <p className="text-xs text-muted-foreground truncate">{asset.description}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {{ prompt: 'פרומפט', agent: 'סוכן', gpt: 'GPT', workflow: 'תהליך', tool: 'כלי', model_config: 'הגדרות מודל' }[asset.asset_type] ?? asset.asset_type}
                            </span>
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 rounded shrink-0',
                              asset.status === 'active'     && 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
                              asset.status === 'draft'      && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
                              asset.status === 'deprecated' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                              asset.status === 'idea'       && 'bg-muted text-muted-foreground',
                            )}>
                              {{ active: 'פעיל', draft: 'טיוטה', deprecated: 'לא בשימוש', idea: 'רעיון' }[asset.status] ?? asset.status}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'decisions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {projectDecisions.length} החלטות
                      </span>
                      <Link
                        href={`/decisions/new?project=${projectId}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Plus className="me-1.5 h-3.5 w-3.5" />
                        תעד החלטה
                      </Link>
                    </div>
                    {projectDecisions.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">אין החלטות רשומות עדיין.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          תעד החלטות מפתח לשמירת רשומה של מה שנבחר ומדוע.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                        {projectDecisions.map((d) => (
                          <Link
                            key={d.id}
                            href={`/decisions/${d.id}`}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                          >
                            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{d.title}</p>
                              {d.decision_made && (
                                <p className="text-xs text-muted-foreground truncate">{d.decision_made}</p>
                              )}
                            </div>
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5',
                              d.status === 'active'     && 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
                              d.status === 'superseded' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
                              d.status === 'reversed'   && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                            )}>
                              {{ active: 'פעיל', superseded: 'הוחלף', reversed: 'בוטל' }[d.status] ?? d.status}
                            </span>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'knowledge' && (
                  <div className="space-y-4">
                    {/* Documentation Health checklist */}
                    <div className="rounded-lg border border-border bg-card p-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        בריאות התיעוד
                      </h3>
                      <div className="space-y-1">
                        {DOC_ROLE_CONFIG.map(({ role, label, critical }) => {
                          const docItem = projectKnowledge.find((k) => k.doc_role === role)
                          const status = docItem?.doc_status ?? null

                          return (
                            <div key={role} className="flex items-center justify-between gap-2 py-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {critical && (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="קריטי" />
                                )}
                                <span className={cn(
                                  'text-xs truncate',
                                  !docItem && 'text-muted-foreground',
                                  docItem && 'text-foreground',
                                )}>
                                  {label}
                                </span>
                              </div>
                              {!docItem ? (
                                <Link
                                  href={`/knowledge/new?project=${projectId}&doc_role=${role}`}
                                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
                                >
                                  + הוסף
                                </Link>
                              ) : (
                                <Link
                                  href={`/knowledge/${docItem.id}`}
                                  className={cn(
                                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80',
                                    status ? DOC_STATUS_STYLE[status] : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  {status ? DOC_STATUS_LABEL[status] : 'לא מוגדר'}
                                </Link>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Knowledge items list */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {projectKnowledge.length} פריטים
                      </span>
                      <Link
                        href={`/knowledge/new?project=${projectId}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Plus className="me-1.5 h-3.5 w-3.5" />
                        הוסף ידע
                      </Link>
                    </div>
                    {projectKnowledge.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">אין פריטי ידע עדיין.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          תעד הערות, תובנות, הפניות ותהליכים הקשורים לפרויקט זה.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                        {projectKnowledge.map((item) => (
                          <Link
                            key={item.id}
                            href={`/knowledge/${item.id}`}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                          >
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              {item.body && (
                                <p className="text-xs text-muted-foreground truncate">{item.body}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              {item.doc_role && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary font-medium">
                                  {item.doc_role.replace(/_/g, ' ')}
                                </span>
                              )}
                              {item.doc_status && (
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                  DOC_STATUS_STYLE[item.doc_status],
                                )}>
                                  {DOC_STATUS_LABEL[item.doc_status]}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {{ note: 'הערה', reference: 'הפניה', learning: 'למידה', process: 'תהליך', research: 'מחקר' }[item.item_type] ?? item.item_type}
                              </span>
                            </div>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right column — Meta + Execution Context */}
              <div className="space-y-4 lg:col-span-1">

                {/* Main meta card */}
                <div className="rounded-lg border border-border bg-card p-4">
                  {/* Status */}
                  <MetaRow label="סטטוס">
                    {statusChanging ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Select
                        value={project.status}
                        onValueChange={(v) => v && handleStatusChange(v as ProjectStatus)}
                      >
                        <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                          <StatusBadge status={project.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </MetaRow>

                  {/* Priority */}
                  <MetaRow label="עדיפות">
                    <Select
                      value={project.priority}
                      onValueChange={(v) => v && handleFieldSave('priority', v as ProjectPriority)}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                        <PriorityBadge priority={project.priority} />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  {/* Type */}
                  <MetaRow label="סוג">
                    <Select
                      value={project.project_type ?? ''}
                      onValueChange={(v) => handleProjectType(v ?? '')}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                        {project.project_type ? (
                          <span className="text-sm capitalize">
                            {PROJECT_TYPE_OPTIONS.find((o) => o.value === project.project_type)?.label ?? project.project_type}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">ללא</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ללא סוג</SelectItem>
                        {PROJECT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  {/* Domain */}
                  <MetaRow label="תחום">
                    <Select
                      value={project.domain ?? ''}
                      onValueChange={(v) => handleFieldSave('domain', v as ProjectDomain)}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                        {project.domain
                          ? <DomainBadge domain={project.domain} />
                          : <span className="text-xs text-muted-foreground italic">ללא</span>
                        }
                      </SelectTrigger>
                      <SelectContent>
                        {DOMAIN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  {/* Current Phase */}
                  <MetaRow label="שלב">
                    <InlineText
                      value={project.current_phase ?? ''}
                      placeholder="הוסף שלב..."
                      onSave={(v) => handleFieldSave('current_phase', v)}
                    />
                  </MetaRow>

                  <MetaRow label="נוצר">
                    <span className="text-sm text-foreground">
                      {format(new Date(project.created_at), 'd/M/yyyy')}
                    </span>
                  </MetaRow>

                  <MetaRow label="עודכן">
                    <span className="text-sm text-foreground">
                      {format(new Date(project.updated_at), 'd/M/yyyy')}
                    </span>
                  </MetaRow>
                </div>

                {/* Workflow Progress Panel */}
                <WorkflowProgressPanel
                  project={project}
                  tasks={projectTasks}
                  knowledgeItems={projectKnowledge}
                  onAdvance={(s) => handleStatusChange(s)}
                  onGenerateGptSpec={handleGenerateGptSpec}
                  generatingSpec={generatingSpec}
                  blockerError={blockerError}
                  onClearError={() => setBlockerError(null)}
                />

                {/* Execution Context card */}
                <div className="rounded-lg border border-border bg-card">
                  <button
                    onClick={() => setExecContextOpen(!execContextOpen)}
                    className="flex w-full items-center justify-between px-4 py-3 text-start"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      הקשר ביצוע
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!execContextOpen && hasExecData && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {[
                            project.assigned_gpt, project.primary_workspace, project.repository_url,
                            project.local_folder_path, project.production_url, project.lovable_url,
                            project.vercel_url, project.current_execution_path,
                          ].filter(Boolean).length} שדות
                        </span>
                      )}
                      {execContextOpen
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </div>
                  </button>

                  {execContextOpen && (
                    <div className="border-t border-border px-4 pb-3 pt-1">
                      <ExecRow label="GPT">
                        <InlineText
                          value={project.assigned_gpt ?? ''}
                          placeholder="עוזר AI..."
                          onSave={(v) => handleFieldSave('assigned_gpt', v)}
                        />
                      </ExecRow>
                      <ExecRow label="סביבה">
                        <InlineText
                          value={project.primary_workspace ?? ''}
                          placeholder="IDE או כלי..."
                          onSave={(v) => handleFieldSave('primary_workspace', v)}
                        />
                      </ExecRow>
                      <ExecRow label="ריפו">
                        <InlineUrl
                          value={project.repository_url ?? ''}
                          placeholder="https://github.com/..."
                          onSave={(v) => handleFieldSave('repository_url', v)}
                        />
                      </ExecRow>
                      <ExecRow label="GitHub">
                        <InlineText
                          value={project.github_project_name ?? ''}
                          placeholder="owner/repo"
                          onSave={(v) => handleFieldSave('github_project_name', v)}
                        />
                      </ExecRow>
                      <ExecRow label="תיקיה">
                        <InlineText
                          value={project.local_folder_path ?? ''}
                          placeholder="C:/Users/..."
                          onSave={(v) => handleFieldSave('local_folder_path', v)}
                        />
                      </ExecRow>
                      <ExecRow label="ייצור">
                        <InlineUrl
                          value={project.production_url ?? ''}
                          placeholder="https://..."
                          onSave={(v) => handleFieldSave('production_url', v)}
                        />
                      </ExecRow>
                      <ExecRow label="Lovable">
                        <InlineUrl
                          value={project.lovable_url ?? ''}
                          placeholder="https://...lovable.app"
                          onSave={(v) => handleFieldSave('lovable_url', v)}
                        />
                      </ExecRow>
                      <ExecRow label="Vercel">
                        <InlineUrl
                          value={project.vercel_url ?? ''}
                          placeholder="https://...vercel.app"
                          onSave={(v) => handleFieldSave('vercel_url', v)}
                        />
                      </ExecRow>
                      <ExecRow label="נתיב">
                        <InlineText
                          value={project.current_execution_path ?? ''}
                          placeholder="תיאור ישיבה פעילה..."
                          onSave={(v) => handleFieldSave('current_execution_path', v)}
                        />
                      </ExecRow>
                    </div>
                  )}
                </div>

                {/* GPT Setup card */}
                {(project.assigned_gpt || project.gpt_role || project.gpt_url || project.knowledge_uploaded) && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        הגדרת GPT
                      </span>
                      {project.knowledge_uploaded && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          Knowledge הועלה ✓
                        </span>
                      )}
                    </div>
                    <div className="px-4 pb-3 pt-1">
                      {project.assigned_gpt && (
                        <ExecRow label="GPT">
                          <InlineText
                            value={project.assigned_gpt}
                            placeholder=""
                            onSave={(v) => handleFieldSave('assigned_gpt', v)}
                          />
                        </ExecRow>
                      )}
                      {project.gpt_url && (
                        <ExecRow label="קישור">
                          <InlineUrl
                            value={project.gpt_url}
                            placeholder="https://chat.openai.com/g/..."
                            onSave={(v) => handleFieldSave('gpt_url', v)}
                          />
                        </ExecRow>
                      )}
                      {project.gpt_role && (
                        <ExecRow label="תפקיד">
                          <InlineText
                            value={project.gpt_role}
                            placeholder=""
                            onSave={(v) => handleFieldSave('gpt_role', v)}
                            multiline
                          />
                        </ExecRow>
                      )}
                      {project.uploaded_knowledge_files && (
                        <ExecRow label="קבצים">
                          <InlineText
                            value={project.uploaded_knowledge_files}
                            placeholder=""
                            onSave={(v) => handleFieldSave('uploaded_knowledge_files', v)}
                          />
                        </ExecRow>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחק פרויקט?</DialogTitle>
            <DialogDescription>
              <strong>{project.name}</strong> יימחק לצמיתות. לא ניתן לבטל פעולה זו.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
