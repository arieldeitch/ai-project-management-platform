'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { useTasksStore } from '@/store/tasks.store'
import { AssetsRepository } from '@/data/repositories/assets.repository'
import { DecisionsRepository } from '@/data/repositories/decisions.repository'
import { KnowledgeRepository } from '@/data/repositories/knowledge.repository'
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
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type {
  Project, ProjectStatus, ProjectPriority, ProjectDomain,
  AIAsset, Decision, KnowledgeItem,
} from '@/types/entities'

/* ── constants ─────────────────────────────────────────────── */

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'idea',      label: 'Idea' },
  { value: 'scoped',    label: 'Scoped' },
  { value: 'active',    label: 'Active' },
  { value: 'blocked',   label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred',  label: 'Deferred' },
  { value: 'archived',  label: 'Archived' },
]

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high',     label: 'High' },
  { value: 'medium',   label: 'Medium' },
  { value: 'low',      label: 'Low' },
  { value: 'unset',    label: 'No priority' },
]

const DOMAIN_OPTIONS: { value: ProjectDomain; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'work',     label: 'Work' },
  { value: 'general',  label: 'General' },
]

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
            <Check className="mr-1 h-3 w-3" /> Save
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
        'group flex w-full items-baseline gap-1.5 rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-muted/60',
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

/* ── main component ────────────────────────────────────────── */

interface ProjectDetailPageProps {
  projectId: string
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const router = useRouter()
  const { projects, isLoading, load, update, remove } = useProjectsStore()
  const { tasks, loadByProject } = useTasksStore()
  const [deleteOpen,     setDeleteOpen]     = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [tab,            setTab]            = useState('overview')
  const [showTaskForm,   setShowTaskForm]   = useState(false)

  const [projectAssets,    setProjectAssets]    = useState<AIAsset[]>([])
  const [projectDecisions, setProjectDecisions] = useState<Decision[]>([])
  const [projectKnowledge, setProjectKnowledge] = useState<KnowledgeItem[]>([])

  useEffect(() => { if (projects.length === 0) load() }, [projects.length, load])

  const project = projects.find((p) => p.id === projectId)

  /* load tasks when tasks tab is opened */
  useEffect(() => {
    if (tab === 'tasks' && project) {
      loadByProject(project.id)
    }
  }, [tab, project, loadByProject])

  useEffect(() => {
    if (tab === 'assets' && project) {
      AssetsRepository.findByProject(project.id).then(setProjectAssets)
    }
  }, [tab, project])

  useEffect(() => {
    if (tab === 'decisions' && project) {
      DecisionsRepository.findByProject(project.id).then(setProjectDecisions)
    }
  }, [tab, project])

  useEffect(() => {
    if (tab === 'knowledge' && project) {
      KnowledgeRepository.findByProject(project.id).then(setProjectKnowledge)
    }
  }, [tab, project])

  const projectTasks = tasks.filter((t) => t.project_id === projectId)

  /* ── handlers ─────────────────────────────────────────────── */

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || statusChanging) return
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

  async function handleFieldSave(field: keyof Project, value: string) {
    if (!project) return
    await update(project.id, { [field]: value })
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
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (!project) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="Project not found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">This project does not exist.</p>
          <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'tasks',     label: `Tasks${projectTasks.length > 0 ? ` (${projectTasks.length})` : ''}` },
    { id: 'assets',    label: `AI Assets${projectAssets.length > 0 ? ` (${projectAssets.length})` : ''}` },
    { id: 'decisions', label: `Decisions${projectDecisions.length > 0 ? ` (${projectDecisions.length})` : ''}` },
    { id: 'knowledge', label: `Knowledge${projectKnowledge.length > 0 ? ` (${projectKnowledge.length})` : ''}` },
  ]

  const openTasks    = projectTasks.filter((t) => t.status !== 'done')
  const blockedTasks = projectTasks.filter((t) => t.status === 'blocked')
  const doneTasks    = projectTasks.filter((t) => t.status === 'done')

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={
            <span className="flex items-center gap-1.5 text-sm">
              <Link href="/projects" className="font-normal text-muted-foreground hover:text-foreground transition-colors">
                Projects
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
                Edit all fields
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleArchive} disabled={project.status === 'archived'}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/projects" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Projects
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
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Blocked</p>
                      <InlineText
                        value={project.blocked_reason ?? ''}
                        placeholder="Click to add blocker reason..."
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
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goal</h2>
                      </div>
                      <InlineText
                        value={project.goal ?? ''}
                        placeholder="Click to add a goal or objective..."
                        onSave={(v) => handleFieldSave('goal', v)}
                        className="font-medium text-foreground"
                      />
                    </section>

                    {/* Next action */}
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Next Action
                      </h2>
                      <InlineText
                        value={project.next_action ?? ''}
                        placeholder="Click to add the immediate next step..."
                        onSave={(v) => handleFieldSave('next_action', v)}
                      />
                    </section>

                    {/* Description */}
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Description
                      </h2>
                      <InlineText
                        value={project.description ?? ''}
                        placeholder="Click to add a description..."
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
                          <span className="text-red-500">{blockedTasks.length} blocked</span>
                        )}
                        <span>{openTasks.length} open</span>
                        {doneTasks.length > 0 && (
                          <span className="text-muted-foreground">{doneTasks.length} done</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setShowTaskForm(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add Task
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
                        <p className="text-sm text-muted-foreground">No tasks yet.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => setShowTaskForm(true)}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add first task
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
                        {projectAssets.length} linked asset{projectAssets.length !== 1 ? 's' : ''}
                      </span>
                      <Link
                        href="/assets/new"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        New asset
                      </Link>
                    </div>
                    {projectAssets.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <Bot className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No assets linked yet.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Create an asset, then link it to this project from the asset detail page.
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
                            <span className="text-xs text-muted-foreground capitalize shrink-0">
                              {asset.asset_type}
                            </span>
                            <span className={cn(
                              'text-xs px-1.5 py-0.5 rounded shrink-0',
                              asset.status === 'active'     && 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
                              asset.status === 'draft'      && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
                              asset.status === 'deprecated' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                              asset.status === 'idea'       && 'bg-muted text-muted-foreground',
                            )}>
                              {asset.status}
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
                        {projectDecisions.length} decision{projectDecisions.length !== 1 ? 's' : ''}
                      </span>
                      <Link
                        href={`/decisions/new?project=${projectId}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Log decision
                      </Link>
                    </div>
                    {projectDecisions.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No decisions logged yet.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Log key decisions to maintain a record of what was chosen and why.
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
                              {d.status}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {projectKnowledge.length} item{projectKnowledge.length !== 1 ? 's' : ''}
                      </span>
                      <Link
                        href={`/knowledge/new?project=${projectId}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add knowledge
                      </Link>
                    </div>
                    {projectKnowledge.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No knowledge items yet.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Capture notes, learnings, references, and processes related to this project.
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
                            <span className="text-xs text-muted-foreground capitalize shrink-0 mt-0.5">
                              {item.item_type}
                            </span>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meta panel — all inline-editable */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4">
                  {/* Status */}
                  <MetaRow label="Status">
                    {statusChanging ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Select
                        value={project.status}
                        onValueChange={(v) => v && handleStatusChange(v as ProjectStatus)}
                      >
                        <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ml-1">
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
                  <MetaRow label="Priority">
                    <Select
                      value={project.priority}
                      onValueChange={(v) => v && handleFieldSave('priority', v as ProjectPriority)}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ml-1">
                        <PriorityBadge priority={project.priority} />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  {/* Domain */}
                  <MetaRow label="Domain">
                    <Select
                      value={project.domain ?? ''}
                      onValueChange={(v) => handleFieldSave('domain', v as ProjectDomain)}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ml-1">
                        {project.domain
                          ? <DomainBadge domain={project.domain} />
                          : <span className="text-xs text-muted-foreground italic">None</span>
                        }
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  {/* Current Phase */}
                  <MetaRow label="Phase">
                    <InlineText
                      value={project.current_phase ?? ''}
                      placeholder="Add phase..."
                      onSave={(v) => handleFieldSave('current_phase', v)}
                    />
                  </MetaRow>

                  <MetaRow label="Created">
                    <span className="text-sm text-foreground">
                      {format(new Date(project.created_at), 'MMM d, yyyy')}
                    </span>
                  </MetaRow>

                  <MetaRow label="Updated">
                    <span className="text-sm text-foreground">
                      {format(new Date(project.updated_at), 'MMM d, yyyy')}
                    </span>
                  </MetaRow>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              <strong>{project.name}</strong> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
