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
import { Plus, FolderKanban, AlertTriangle } from 'lucide-react'
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

function ProjectCard({ project }: { project: Project }) {
  const updatedAt = formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
  const isBlocked = project.status === 'blocked'
  const isActive = project.status === 'active'
  const isScoped = project.status === 'scoped'
  const isDimmed =
    project.status === 'completed' ||
    project.status === 'deferred' ||
    project.status === 'archived'

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group block rounded-lg border transition-colors',
        isBlocked && 'border-red-200 border-l-4 border-l-red-500 bg-red-50/40 hover:bg-red-50/60',
        isActive &&
          'border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/30',
        isScoped && 'border-sky-200 border-l-4 border-l-sky-400 bg-sky-50/10 hover:bg-sky-50/20',
        !isBlocked && !isActive && !isScoped && 'border-border hover:bg-muted/40',
        isDimmed && 'opacity-55',
      )}
    >
      <div className="px-4 py-3.5">
        {/* Project name */}
        <p
          className={cn(
            'font-semibold leading-snug transition-colors group-hover:text-primary',
            isDimmed ? 'text-[14px] text-muted-foreground' : 'text-[15px] text-foreground',
          )}
        >
          {project.name}
        </p>

        {/* Execution line: blocked reason takes priority over next action */}
        {isBlocked && project.blocked_reason ? (
          <div className="mt-1.5 flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
            <p className="text-[13px] font-medium text-red-700 line-clamp-2">
              {project.blocked_reason}
            </p>
          </div>
        ) : project.next_action ? (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="shrink-0 text-[11px] font-bold leading-none text-primary">→</span>
            <p className="text-[13px] font-medium text-foreground/75 line-clamp-2">
              {project.next_action}
            </p>
          </div>
        ) : project.description ? (
          <p className="mt-1 text-[13px] text-muted-foreground line-clamp-1">
            {project.description}
          </p>
        ) : null}

        {/* Metadata footer: badges left, domain + timestamp right */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {project.priority !== 'unset' && (
              <PriorityBadge priority={project.priority} />
            )}
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-2">
            {project.domain && <DomainBadge domain={project.domain} />}
            <span className="tabular-nums text-[11px] text-muted-foreground">{updatedAt}</span>
          </div>
        </div>
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

  /* apply filters — logic unchanged */
  const afterStatus =
    statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter)
  const afterDomain =
    domainFilter === 'all' ? afterStatus : afterStatus.filter((p) => p.domain === domainFilter)
  const filtered = sortProjects(afterDomain, sort)

  /* counts — always computed from domain-filtered set */
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

      {/* Primary filter — status tabs */}
      <div className="flex items-stretch border-b border-border bg-background px-4 overflow-x-auto">
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
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {opt.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Secondary filter — domain + sort */}
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
          {(['status', 'priority', 'updated'] as SortMode[]).map((s) => (
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

      {/* Card list */}
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
          <div className="space-y-2 p-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
