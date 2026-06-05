'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { DomainBadge } from '@/components/shared/DomainBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TopBar } from '@/components/layout/TopBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus, FolderKanban, ChevronRight, ArrowUpDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_ORDER } from '@/lib/constants/statuses'
import type { Project, ProjectStatus, ProjectDomain, ProjectPriority } from '@/types/entities'
import { formatDistanceToNow } from 'date-fns'

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

type DomainFilter = 'all' | ProjectDomain
type SortMode = 'status' | 'priority' | 'updated'

const STATUS_FILTER_OPTIONS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'blocked',   label: 'Blocked' },
  { value: 'scoped',    label: 'Scoped' },
  { value: 'idea',      label: 'Idea' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred',  label: 'Deferred' },
  { value: 'archived',  label: 'Archived' },
]

const DOMAIN_FILTER_OPTIONS: { value: DomainFilter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'work',     label: 'Work' },
  { value: 'general',  label: 'General' },
]

function sortProjects(list: Project[], mode: SortMode): Project[] {
  const copy = [...list]
  if (mode === 'priority') {
    return copy.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
  }
  if (mode === 'updated') {
    return copy.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
  return copy.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
}

function ProjectRow({ project }: { project: Project }) {
  const updatedAt = formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-start gap-4 border-b border-border px-6 py-3.5 last:border-0 hover:bg-muted/40 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground group-hover:text-primary">
            {project.name}
          </span>
          {project.domain && <DomainBadge domain={project.domain} />}
        </div>
        {/* Show blocked reason prominently for blocked projects */}
        {project.status === 'blocked' && project.blocked_reason ? (
          <div className="mt-1 flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
            <p className="text-xs text-red-600/80 dark:text-red-400/70 line-clamp-1">
              {project.blocked_reason}
            </p>
          </div>
        ) : project.next_action ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            → {project.next_action}
          </p>
        ) : project.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        <PriorityBadge priority={project.priority} />
        <StatusBadge status={project.status} />
        <span className="hidden text-xs text-muted-foreground sm:block w-24 text-right">
          {updatedAt}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

interface ProjectsListPageProps {
  initialStatus?: ProjectStatus
  initialDomain?: ProjectDomain
}

export function ProjectsListPage({ initialStatus, initialDomain }: ProjectsListPageProps) {
  const { projects, isLoading, load } = useProjectsStore()
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>(initialStatus ?? 'all')
  const [domainFilter, setDomainFilter] = useState<DomainFilter>(initialDomain ?? 'all')
  const [sort, setSort] = useState<SortMode>('status')

  useEffect(() => {
    load()
  }, [load])

  /* apply filters */
  const afterStatus =
    statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter)
  const afterDomain =
    domainFilter === 'all' ? afterStatus : afterStatus.filter((p) => p.domain === domainFilter)
  const filtered = sortProjects(afterDomain, sort)

  /* counts for status tabs — always computed from domain-filtered set */
  const domainBase =
    domainFilter === 'all' ? projects : projects.filter((p) => p.domain === domainFilter)

  function statusCount(s: ProjectStatus | 'all') {
    return s === 'all' ? domainBase.length : domainBase.filter((p) => p.status === s).length
  }

  function domainCount(d: DomainFilter) {
    return d === 'all' ? projects.length : projects.filter((p) => p.domain === d).length
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="Projects"
        actions={
          <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Link>
        }
      />

      {/* Unified filter bar */}
      <div className="flex items-center border-b border-border bg-background px-6 overflow-x-auto">
        {/* Status tabs — underline style */}
        <div className="flex flex-1 items-stretch gap-0">
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const count = statusCount(opt.value)
            if (opt.value !== 'all' && count === 0) return null
            const active = statusFilter === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Domain filter — compact button group */}
        <div className="ml-3 flex shrink-0 items-center gap-1 border-l border-border pl-3 py-2">
          {DOMAIN_FILTER_OPTIONS.map((opt) => {
            const count = domainCount(opt.value)
            if (opt.value !== 'all' && count === 0) return null
            return (
              <button
                key={opt.value}
                onClick={() => setDomainFilter(opt.value)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                  domainFilter === opt.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Sort */}
        <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border pl-3 py-2">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          {(['status', 'priority', 'updated'] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                'rounded px-2 py-1 text-xs capitalize transition-colors',
                sort === s
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-12 w-12" />}
            title="No projects here"
            description={
              statusFilter === 'all' && domainFilter === 'all'
                ? 'Create your first project to get started.'
                : 'No projects match the current filters.'
            }
            action={
              statusFilter === 'all' && domainFilter === 'all' ? (
                <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Project
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div>
            {filtered.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
