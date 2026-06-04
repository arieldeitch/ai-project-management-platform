'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { TopBar } from '@/components/layout/TopBar'
import { buttonVariants } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Play,
  Target,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_CONFIG } from '@/lib/constants/priorities'
import type { Project, ProjectPriority } from '@/types/entities'

/* ── helpers ───────────────────────────────────────────────── */

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

function byPriority(a: Project, b: Project) {
  return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
}

/* ── sub-components ────────────────────────────────────────── */

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card px-5 py-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('mt-1 text-3xl font-bold tabular-nums', accent ?? 'text-foreground')}>
        {value}
      </span>
    </div>
  )
}

function FocusCard({ project }: { project: Project }) {
  const priorityCfg = PRIORITY_CONFIG[project.priority]
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold uppercase tracking-wider', priorityCfg.color)}>
              {priorityCfg.label}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <StatusBadge status={project.status} />
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-foreground group-hover:text-primary">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.next_action && (
            <div className="mt-3 flex items-start gap-1.5">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-sm font-medium text-foreground">{project.next_action}</span>
            </div>
          )}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {project.name}
        </p>
        {project.next_action && (
          <p className="truncate text-xs text-muted-foreground">→ {project.next_action}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <PriorityBadge priority={project.priority} />
        <StatusBadge status={project.status} />
      </div>
    </Link>
  )
}

function BlockedRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-start gap-3 rounded-md px-3 py-3 transition-colors hover:bg-red-50/50 dark:hover:bg-red-950/20"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {project.name}
        </p>
        {project.next_action ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Needs: {project.next_action}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-red-500/70">No next action defined</p>
        )}
      </div>
      <PriorityBadge priority={project.priority} className="shrink-0" />
    </Link>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  href,
  accentClass,
}: {
  icon: React.ElementType
  title: string
  count?: number
  href?: string
  accentClass?: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', accentClass ?? 'text-muted-foreground')} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      )}
    </div>
  )
}

/* ── main page ─────────────────────────────────────────────── */

export function DashboardPage() {
  const { projects, isLoading, load } = useProjectsStore()

  useEffect(() => {
    load()
  }, [load])

  /* derived data */
  const active    = projects.filter((p) => p.status === 'active').sort(byPriority)
  const blocked   = projects.filter((p) => p.status === 'blocked').sort(byPriority)
  const scoped    = projects.filter((p) => p.status === 'scoped').sort(byPriority)
  const ideas     = projects.filter((p) => p.status === 'idea' && p.priority !== 'unset' && p.priority !== 'low').sort(byPriority)
  const completed = projects.filter((p) => p.status === 'completed').length

  const focusProject  = active[0] ?? scoped[0] ?? null
  const remainActive  = focusProject?.status === 'active' ? active.slice(1, 6) : active.slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading portfolio...
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="Dashboard"
        actions={
          <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-8 p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill label="Total"     value={projects.length} />
            <StatPill label="Active"    value={active.length}    accent="text-emerald-600 dark:text-emerald-400" />
            <StatPill label="Blocked"   value={blocked.length}   accent="text-red-600 dark:text-red-400" />
            <StatPill label="Completed" value={completed}        accent="text-violet-600 dark:text-violet-400" />
          </div>

          {/* Empty state */}
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl">🗂</div>
              <h2 className="mt-4 text-base font-semibold">Portfolio is empty</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first project to start tracking your work.
              </p>
              <Link href="/projects/new" className={cn(buttonVariants(), 'mt-4')}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Project
              </Link>
            </div>
          )}

          {/* Blocked — urgent, always first */}
          {blocked.length > 0 && (
            <section>
              <SectionHeader
                icon={AlertTriangle}
                title="Blocked"
                count={blocked.length}
                href="/projects?status=blocked"
                accentClass="text-red-500"
              />
              <div className="rounded-lg border border-red-200 bg-red-50/40 dark:border-red-900/30 dark:bg-red-950/10">
                {blocked.map((p) => (
                  <BlockedRow key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

          {/* Focus Now */}
          {focusProject && (
            <section>
              <SectionHeader
                icon={Target}
                title="Focus Now"
                accentClass="text-primary"
              />
              <FocusCard project={focusProject} />
            </section>
          )}

          {/* Active projects */}
          {remainActive.length > 0 && (
            <section>
              <SectionHeader
                icon={Play}
                title="Active"
                count={active.length}
                href={active.length > 5 ? '/projects?status=active' : undefined}
                accentClass="text-emerald-500"
              />
              <div className="rounded-lg border border-border bg-card">
                {remainActive.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

          {/* Ready to start (scoped) */}
          {scoped.length > 0 && (
            <section>
              <SectionHeader
                icon={ArrowRight}
                title="Ready to Start"
                count={scoped.length}
                href={scoped.length > 4 ? '/projects?status=scoped' : undefined}
                accentClass="text-blue-500"
              />
              <div className="rounded-lg border border-border bg-card">
                {scoped.slice(0, 4).map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

          {/* High-value ideas */}
          {ideas.length > 0 && (
            <section>
              <SectionHeader
                icon={Lightbulb}
                title="High-Priority Ideas"
                count={ideas.length}
                href={ideas.length > 4 ? '/projects?status=idea' : undefined}
                accentClass="text-amber-500"
              />
              <div className="rounded-lg border border-border bg-card">
                {ideas.slice(0, 4).map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
