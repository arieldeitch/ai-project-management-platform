'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { DomainBadge } from '@/components/shared/DomainBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TopBar } from '@/components/layout/TopBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus, FolderKanban, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus, ProjectDomain, ProjectPriority } from '@/types/entities'
import { formatDistanceToNow } from 'date-fns'

/* ── types ─────────────────────────────────────────────────── */

type DomainFilter = 'all' | ProjectDomain
type SortMode = 'priority' | 'updated'

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

/* A. Priority left-border accent (replaces badge as primary priority signal) */
const PRIORITY_BORDER: Record<ProjectPriority, string> = {
  critical: 'border-l-[3px] border-l-red-500',
  high:     'border-l-[3px] border-l-orange-400',
  medium:   'border-l-[3px] border-l-indigo-400',
  low:      'border-l-[3px] border-l-zinc-300',
  unset:    '',
}

/* ── column definitions ────────────────────────────────────── */

interface ColumnConfig {
  status:     ProjectStatus
  label:      string
  dot:        string
  headerBg:   string
  headerText: string
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  { status: 'idea',      label: 'Idea',      dot: 'bg-zinc-400',    headerBg: 'bg-zinc-100/80',  headerText: 'text-zinc-600' },
  { status: 'scoped',    label: 'Scoped',    dot: 'bg-sky-500',     headerBg: 'bg-sky-50',       headerText: 'text-sky-700' },
  { status: 'active',    label: 'Active',    dot: 'bg-emerald-500', headerBg: 'bg-emerald-100',  headerText: 'text-emerald-700' },
  { status: 'blocked',   label: 'Blocked',   dot: 'bg-red-500',     headerBg: 'bg-red-100',      headerText: 'text-red-700' },
  { status: 'completed', label: 'Completed', dot: 'bg-violet-500',  headerBg: 'bg-violet-50',    headerText: 'text-violet-700' },
  { status: 'deferred',  label: 'Deferred',  dot: 'bg-amber-500',   headerBg: 'bg-amber-50',     headerText: 'text-amber-700' },
  { status: 'archived',  label: 'Archived',  dot: 'bg-zinc-300',    headerBg: 'bg-zinc-100/60',  headerText: 'text-zinc-500' },
]

const DOMAIN_FILTER_OPTIONS: { value: DomainFilter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'work',     label: 'Work' },
  { value: 'general',  label: 'General' },
]

/* ── sort ──────────────────────────────────────────────────── */

function sortProjects(list: Project[], mode: SortMode): Project[] {
  const copy = [...list]
  if (mode === 'priority') {
    return copy.sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    )
  }
  return copy.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

/* ── D. PortfolioKPI ───────────────────────────────────────── */

function PortfolioKPI({ projects }: { projects: Project[] }) {
  const kpis = [
    { label: 'Total',     value: projects.length,                                          accent: 'text-foreground' },
    { label: 'Active',    value: projects.filter((p) => p.status === 'active').length,    accent: 'text-emerald-700' },
    { label: 'Blocked',   value: projects.filter((p) => p.status === 'blocked').length,   accent: 'text-red-600' },
    { label: 'Scoped',    value: projects.filter((p) => p.status === 'scoped').length,    accent: 'text-sky-700' },
    { label: 'Completed', value: projects.filter((p) => p.status === 'completed').length, accent: 'text-violet-700' },
  ]

  return (
    <div className="flex items-center gap-0 border-b border-border bg-background px-4 py-1.5">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={cn(
            'flex items-baseline gap-1.5 px-3',
            i > 0 && 'border-l border-border',
            i === 0 && 'pl-0',
          )}
        >
          <span className={cn('font-display text-[18px] font-semibold tabular-nums leading-none', kpi.accent)}>
            {kpi.value}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {kpi.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── E+F. KanbanTicket ─────────────────────────────────────── */

function KanbanTicket({ project }: { project: Project }) {
  const updatedAt = formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
  const isBlocked = project.status === 'blocked'
  const isDimmed  = project.status === 'completed' || project.status === 'deferred' || project.status === 'archived'
  /* A. Priority border — suppressed on blocked tickets (red blocked treatment takes precedence) */
  const priorityBorder = isBlocked ? '' : PRIORITY_BORDER[project.priority]

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        /* E. Reduced padding for density */
        'group block rounded border bg-card p-2 transition-colors',
        'hover:border-primary/40 hover:shadow-sm',
        priorityBorder,
        isBlocked && 'border-red-200 bg-red-50/60 hover:border-red-300',
        isDimmed && 'opacity-60',
      )}
    >
      {/* F. Name — structural title, rendered as label weight */}
      <p className="text-[11px] font-medium leading-snug text-muted-foreground line-clamp-1 transition-colors group-hover:text-primary">
        {project.name}
      </p>

      {/* F. Primary line — next action or blocked reason, promoted to main text */}
      {isBlocked && project.blocked_reason ? (
        <div className="mt-0.5 flex items-start gap-1">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-red-500" />
          <p className="text-[12px] font-semibold text-red-600 line-clamp-1">
            {project.blocked_reason}
          </p>
        </div>
      ) : project.next_action ? (
        <p className="mt-0.5 text-[12px] font-semibold text-foreground line-clamp-1">
          {project.next_action}
        </p>
      ) : null}

      {/* Footer — domain + timestamp (priority conveyed by left border) */}
      <div className="mt-1 flex items-center justify-between gap-1">
        {project.domain ? (
          <DomainBadge domain={project.domain} className="px-1.5 py-0 text-[10px]" />
        ) : (
          <span />
        )}
        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
          {updatedAt}
        </span>
      </div>
    </Link>
  )
}

/* ── B+C+G. KanbanColumn ───────────────────────────────────── */

function KanbanColumn({
  config,
  projects,
  sort,
}: {
  config:   ColumnConfig
  projects: Project[]
  sort:     SortMode
}) {
  const isEmpty   = projects.length === 0
  const isActive  = config.status === 'active'
  const isBlocked = config.status === 'blocked'
  const sorted    = sortProjects(projects, sort)

  /* G. Empty columns collapse to a narrow labeled strip */
  if (isEmpty) {
    return (
      <div className="flex w-[36px] shrink-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-muted/10">
        <div className={cn('flex flex-1 flex-col items-center gap-2 px-2 py-3', config.headerBg)}>
          <span className={cn('h-2 w-2 rounded-full shrink-0', config.dot)} />
          <span
            className={cn('text-[10px] font-semibold', config.headerText)}
            style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
          >
            {config.label}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/20',
        /* B. Active column: wider + stronger border + shadow */
        isActive ? 'w-[240px] border-emerald-200 shadow-sm' : 'w-[220px] border-border',
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          /* B. Active header: stronger bg */
          isActive ? 'bg-emerald-100' : config.headerBg,
        )}
      >
        <div className="flex items-center gap-1.5">
          {/* C. Blocked header: warning icon replaces dot */}
          {isBlocked ? (
            <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" />
          ) : (
            <span className={cn('h-2 w-2 rounded-full', config.dot)} />
          )}
          <span className={cn('text-[12px] font-semibold', config.headerText)}>
            {config.label}
          </span>
        </div>
        {/* C. Blocked count: filled red badge; others: plain dim number */}
        {isBlocked ? (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold text-white tabular-nums">
            {projects.length}
          </span>
        ) : (
          <span className={cn('font-mono text-[11px] tabular-nums opacity-70', config.headerText)}>
            {projects.length}
          </span>
        )}
      </div>

      {/* Column body */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {sorted.map((p) => (
          <KanbanTicket key={p.id} project={p} />
        ))}
      </div>
    </div>
  )
}

/* ── ProjectsListPage ──────────────────────────────────────── */

interface ProjectsListPageProps {
  initialStatus?: ProjectStatus
  initialDomain?: ProjectDomain
}

export function ProjectsListPage({ initialDomain }: ProjectsListPageProps) {
  const { projects, isLoading, load } = useProjectsStore()
  const [domainFilter, setDomainFilter] = useState<DomainFilter>(initialDomain ?? 'all')
  const [sort, setSort] = useState<SortMode>('priority')

  useEffect(() => {
    load()
  }, [load])

  const visible =
    domainFilter === 'all' ? projects : projects.filter((p) => p.domain === domainFilter)

  function domainCount(d: DomainFilter) {
    return d === 'all' ? projects.length : projects.filter((p) => p.domain === d).length
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar
        title="Projects"
        actions={
          <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Link>
        }
      />

      {/* Filter bar — domain + sort */}
      <div className="flex items-center gap-4 border-b border-border bg-background px-4 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Domain
          </span>
          {DOMAIN_FILTER_OPTIONS.map((opt) => {
            const count = domainCount(opt.value)
            if (opt.value !== 'all' && count === 0) return null
            return (
              <button
                key={opt.value}
                onClick={() => setDomainFilter(opt.value)}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap',
                  domainFilter === opt.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sort
          </span>
          {(['priority', 'updated'] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                'rounded px-2 py-0.5 text-xs capitalize transition-colors',
                sort === s
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* D. Portfolio KPI strip — rendered above the board when projects exist */}
      {!isLoading && projects.length > 0 && <PortfolioKPI projects={visible} />}

      {/* Board */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<FolderKanban className="h-12 w-12" />}
            title="No projects yet"
            description="Create your first project to get started."
            action={
              <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Project
              </Link>
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-3 p-4" style={{ minWidth: 'max-content' }}>
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                config={col}
                projects={visible.filter((p) => p.status === col.status)}
                sort={sort}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
