'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
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

/* ── column definitions ────────────────────────────────────── */

interface ColumnConfig {
  status: ProjectStatus
  label: string
  dot: string
  headerBg: string
  headerText: string
  emptyText: string
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    status:     'idea',
    label:      'Idea',
    dot:        'bg-zinc-400',
    headerBg:   'bg-zinc-100/80',
    headerText: 'text-zinc-600',
    emptyText:  'No ideas yet',
  },
  {
    status:     'scoped',
    label:      'Scoped',
    dot:        'bg-sky-500',
    headerBg:   'bg-sky-50',
    headerText: 'text-sky-700',
    emptyText:  'Nothing scoped',
  },
  {
    status:     'active',
    label:      'Active',
    dot:        'bg-emerald-500',
    headerBg:   'bg-emerald-50',
    headerText: 'text-emerald-700',
    emptyText:  'No active projects',
  },
  {
    status:     'blocked',
    label:      'Blocked',
    dot:        'bg-red-500',
    headerBg:   'bg-red-50',
    headerText: 'text-red-700',
    emptyText:  'Nothing blocked',
  },
  {
    status:     'completed',
    label:      'Completed',
    dot:        'bg-violet-500',
    headerBg:   'bg-violet-50',
    headerText: 'text-violet-700',
    emptyText:  'Nothing completed',
  },
  {
    status:     'deferred',
    label:      'Deferred',
    dot:        'bg-amber-500',
    headerBg:   'bg-amber-50',
    headerText: 'text-amber-700',
    emptyText:  'Nothing deferred',
  },
  {
    status:     'archived',
    label:      'Archived',
    dot:        'bg-zinc-300',
    headerBg:   'bg-zinc-100/60',
    headerText: 'text-zinc-500',
    emptyText:  'Nothing archived',
  },
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

/* ── KanbanTicket ──────────────────────────────────────────── */

function KanbanTicket({ project }: { project: Project }) {
  const updatedAt = formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
  const isBlocked = project.status === 'blocked'
  const isDimmed =
    project.status === 'completed' ||
    project.status === 'deferred' ||
    project.status === 'archived'

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group block rounded border bg-card p-2.5 transition-colors',
        'hover:border-primary/40 hover:shadow-sm',
        isBlocked && 'border-red-200 bg-red-50/60 hover:border-red-300',
        isDimmed && 'opacity-60',
      )}
    >
      {/* Project name */}
      <p className="text-[12px] font-semibold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
        {project.name}
      </p>

      {/* Execution line */}
      {isBlocked && project.blocked_reason ? (
        <div className="mt-1 flex items-start gap-1">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-red-500" />
          <p className="text-[11px] font-medium text-red-600 line-clamp-1">
            {project.blocked_reason}
          </p>
        </div>
      ) : project.next_action ? (
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
          → {project.next_action}
        </p>
      ) : null}

      {/* Metadata footer */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1">
          {project.priority !== 'unset' && (
            <PriorityBadge
              priority={project.priority}
              className="px-1.5 py-0 text-[10px] gap-1"
            />
          )}
          {project.domain && (
            <DomainBadge
              domain={project.domain}
              className="px-1.5 py-0 text-[10px]"
            />
          )}
        </div>
        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
          {updatedAt}
        </span>
      </div>
    </Link>
  )
}

/* ── KanbanColumn ──────────────────────────────────────────── */

function KanbanColumn({
  config,
  projects,
  sort,
}: {
  config: ColumnConfig
  projects: Project[]
  sort: SortMode
}) {
  const sorted = sortProjects(projects, sort)

  return (
    <div className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/20">
      {/* Column header */}
      <div className={cn('flex items-center justify-between px-3 py-2', config.headerBg)}>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', config.dot)} />
          <span className={cn('text-[12px] font-semibold', config.headerText)}>
            {config.label}
          </span>
        </div>
        <span className={cn('font-mono text-[11px] tabular-nums', config.headerText, 'opacity-70')}>
          {projects.length}
        </span>
      </div>

      {/* Column body */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">
            {config.emptyText}
          </p>
        ) : (
          sorted.map((p) => <KanbanTicket key={p.id} project={p} />)
        )}
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

  /* domain filter — status split handled by columns */
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
