'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { DomainBadge } from '@/components/shared/DomainBadge'
import { TopBar } from '@/components/layout/TopBar'
import { buttonVariants } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Play,
  Target,
  Plus,
  Clock,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_CONFIG } from '@/lib/constants/priorities'
import type { Project, ProjectDomain, ProjectPriority } from '@/types/entities'

/* ── helpers ───────────────────────────────────────────────── */

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

function byPriority(a: Project, b: Project) {
  return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
}

function daysAgo(dateString: string): number {
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
}

type DomainFilter = 'all' | ProjectDomain

const DOMAIN_TABS: { value: DomainFilter; label: string }[] = [
  { value: 'all',      label: 'הכל' },
  { value: 'personal', label: 'אישי' },
  { value: 'work',     label: 'עבודה' },
  { value: 'general',  label: 'כללי' },
]

const DOMAIN_EMPTY_LABEL: Record<DomainFilter, string> = {
  all:      'הפורטפוליו ריק',
  personal: 'אין פרויקטים אישיים',
  work:     'אין פרויקטים מעבודה',
  general:  'אין פרויקטים כלליים',
}

/* ── sub-components ────────────────────────────────────────── */

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string
  value: number
  accent?: string
  href?: string
}) {
  const inner = (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border/80 hover:bg-muted/20">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('mt-1.5 font-display text-[24px] font-semibold tabular-nums', accent ?? 'text-foreground')}>
        {value}
      </span>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function FocusCard({ project }: { project: Project }) {
  const priorityCfg = PRIORITY_CONFIG[project.priority]
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-lg border border-border bg-card p-5 shadow-card transition-colors hover:shadow-card-hover hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-semibold uppercase tracking-wider', priorityCfg.color)}>
              {priorityCfg.label}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <StatusBadge status={project.status} />
            {project.domain && <DomainBadge domain={project.domain} />}
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-foreground group-hover:text-primary">
            {project.name}
          </h3>
          {project.goal && (
            <p className="mt-1 text-sm font-medium text-primary/80">
              מטרה: {project.goal}
            </p>
          )}
          {project.description && !project.goal && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.next_action && (
            <div className="mt-3 flex items-start gap-1.5 rounded-md bg-primary/5 px-3 py-2">
              <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-sm font-medium text-foreground">{project.next_action}</span>
            </div>
          )}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}

function ProjectRow({ project, showDomain }: { project: Project; showDomain?: boolean }) {
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
          <p className="truncate text-xs text-muted-foreground">{project.next_action}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {showDomain && project.domain && <DomainBadge domain={project.domain} />}
        <PriorityBadge priority={project.priority} />
        <StatusBadge status={project.status} />
      </div>
    </Link>
  )
}

function BlockedRow({ project }: { project: Project }) {
  const days = daysAgo(project.updated_at)
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-start gap-3 border-b border-red-200/60 px-4 py-3 last:border-0 transition-colors hover:bg-red-50/50 dark:border-red-900/20 dark:hover:bg-red-950/20"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {project.name}
          </p>
          {project.domain && <DomainBadge domain={project.domain} />}
        </div>
        {project.blocked_reason ? (
          <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70 line-clamp-1">
            {project.blocked_reason}
          </p>
        ) : project.next_action ? (
          <p className="mt-0.5 text-xs text-muted-foreground">דרוש: {project.next_action}</p>
        ) : (
          <p className="mt-0.5 text-xs text-red-500/60 italic">לא נרשמה סיבת חסימה</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <PriorityBadge priority={project.priority} />
        {days > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-500/70">
            <Clock className="h-3 w-3" />
            חסום {days}י
          </span>
        )}
      </div>
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
          הצג הכל
        </Link>
      )}
    </div>
  )
}

/* ── main page ─────────────────────────────────────────────── */

export function DashboardPage() {
  const { projects, isLoading, load } = useProjectsStore()
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all')

  useEffect(() => {
    load()
  }, [load])

  const visible =
    domainFilter === 'all'
      ? projects
      : projects.filter((p) => p.domain === domainFilter)

  const active    = visible.filter((p) => p.status === 'active').sort(byPriority)
  const blocked   = visible.filter((p) => p.status === 'blocked').sort(byPriority)
  const scoped    = visible.filter((p) => p.status === 'scoped').sort(byPriority)
  const ideas     = visible.filter((p) => p.status === 'idea' && p.priority !== 'unset' && p.priority !== 'low').sort(byPriority)
  const completed = visible.filter((p) => p.status === 'completed').length

  const focusProject = active[0] ?? scoped[0] ?? null
  const remainActive = focusProject?.status === 'active' ? active.slice(1, 6) : active.slice(0, 5)

  const domainCounts: Record<DomainFilter, number> = {
    all:      projects.length,
    personal: projects.filter((p) => p.domain === 'personal').length,
    work:     projects.filter((p) => p.domain === 'work').length,
    general:  projects.filter((p) => p.domain === 'general').length,
  }

  const showDomain = domainFilter === 'all'

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        טוען פורטפוליו...
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="לוח בקרה"
        actions={
          <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            פרויקט חדש
          </Link>
        }
      />

      {/* Domain filter tabs */}
      <div className="flex items-stretch border-b border-border bg-background px-6">
        {DOMAIN_TABS.map((tab) => {
          const count = domainCounts[tab.value]
          if (tab.value !== 'all' && count === 0) return null
          const isActive = domainFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setDomainFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-8 p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label='סה"כ'
              value={visible.length}
              href={domainFilter === 'all' ? '/projects' : `/projects?domain=${domainFilter}`}
            />
            <StatCard
              label="פעיל"
              value={active.length}
              accent="text-emerald-600 dark:text-emerald-400"
              href="/projects?status=active"
            />
            <StatCard
              label="חסום"
              value={blocked.length}
              accent={blocked.length > 0 ? 'text-red-600 dark:text-red-400' : undefined}
              href={blocked.length > 0 ? '/projects?status=blocked' : undefined}
            />
            <StatCard
              label="הושלם"
              value={completed}
              accent="text-violet-600 dark:text-violet-400"
              href="/projects?status=completed"
            />
          </div>

          {/* Empty state */}
          {visible.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl">🗂</div>
              <h2 className="mt-4 text-base font-semibold">
                {DOMAIN_EMPTY_LABEL[domainFilter]}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {domainFilter === 'all'
                  ? 'צור את הפרויקט הראשון שלך למעקב אחר העבודה.'
                  : 'עבור להכל או צור פרויקט בתחום זה.'}
              </p>
              {domainFilter === 'all' && (
                <Link href="/projects/new" className={cn(buttonVariants(), 'mt-4')}>
                  <Plus className="me-1.5 h-4 w-4" />
                  פרויקט חדש
                </Link>
              )}
            </div>
          )}

          {/* Blocked — urgent, always first */}
          {blocked.length > 0 && (
            <section>
              <SectionHeader
                icon={AlertTriangle}
                title="חסום"
                count={blocked.length}
                href="/projects?status=blocked"
                accentClass="text-red-500"
              />
              <div className="overflow-hidden rounded-lg border border-red-200 border-s-4 border-s-red-500 bg-red-50/40 shadow-card dark:border-red-900/30 dark:border-s-red-600 dark:bg-red-950/10">
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
                title="פוקוס עכשיו"
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
                title="פעיל"
                count={active.length}
                href={active.length > 5 ? '/projects?status=active' : undefined}
                accentClass="text-emerald-500"
              />
              <div className="rounded-lg border border-border bg-card shadow-card">
                {remainActive.map((p) => (
                  <ProjectRow key={p.id} project={p} showDomain={showDomain} />
                ))}
              </div>
            </section>
          )}

          {/* Ready to start (scoped) */}
          {scoped.length > 0 && (
            <section>
              <SectionHeader
                icon={ArrowRight}
                title="מוכן להתחיל"
                count={scoped.length}
                href={scoped.length > 4 ? '/projects?status=scoped' : undefined}
                accentClass="text-blue-500"
              />
              <div className="rounded-lg border border-border bg-card shadow-card">
                {scoped.slice(0, 4).map((p) => (
                  <ProjectRow key={p.id} project={p} showDomain={showDomain} />
                ))}
              </div>
            </section>
          )}

          {/* High-value ideas */}
          {ideas.length > 0 && (
            <section>
              <SectionHeader
                icon={Lightbulb}
                title="רעיונות עם עדיפות גבוהה"
                count={ideas.length}
                href={ideas.length > 4 ? '/projects?status=idea' : undefined}
                accentClass="text-amber-500"
              />
              <div className="rounded-lg border border-border bg-card shadow-card">
                {ideas.slice(0, 4).map((p) => (
                  <ProjectRow key={p.id} project={p} showDomain={showDomain} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
