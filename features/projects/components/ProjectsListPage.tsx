'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { TopBar } from '@/components/layout/TopBar'
import { buttonVariants } from '@/components/ui/button'
import { Plus, FolderKanban, ChevronRight, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_ORDER } from '@/lib/constants/statuses'
import type { Project, ProjectStatus, ProjectPriority } from '@/types/entities'
import { formatDistanceToNow } from 'date-fns'

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

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

type SortMode = 'status' | 'priority' | 'updated'

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
      className="group flex items-center gap-4 border-b border-border px-6 py-4 last:border-0 hover:bg-muted/40 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {project.name}
        </span>
        {project.next_action ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            → {project.next_action}
          </p>
        ) : project.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-4">
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

export function ProjectsListPage() {
  const { projects, isLoading, load } = useProjectsStore()
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [sort, setSort]     = useState<SortMode>('status')

  useEffect(() => {
    load()
  }, [load])

  const base     = filter === 'all' ? projects : projects.filter((p) => p.status === filter)
  const filtered = sortProjects(base, sort)

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

      {/* Filter + sort bar */}
      <div className="flex items-center gap-1 border-b border-border bg-background px-6 py-2 overflow-x-auto">
        <div className="flex flex-1 items-center gap-1">
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === 'all'
                ? projects.length
                : projects.filter((p) => p.status === opt.value).length
            if (opt.value !== 'all' && count === 0) return null
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  filter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    filter === opt.value ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        {/* Sort */}
        <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border pl-3">
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
              filter === 'all'
                ? 'Create your first project to get started.'
                : `No ${filter} projects.`
            }
            action={
              filter === 'all' ? (
                <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Project
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-none">
            {filtered.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
