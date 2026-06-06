'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProjectsStore } from '@/store/projects.store'
import { useKnowledgeStore } from '@/store/knowledge.store'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Bot,
  BookOpen, FileText, Settings, Sparkles, AlertTriangle, FileX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectPriority, DocRole } from '@/types/entities'

/* ── nav config ────────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  icon: FolderKanban },
  { href: '/tasks',     label: 'Tasks',     icon: CheckSquare },
  { href: '/assets',    label: 'AI Assets', icon: Bot },
  { href: '/decisions', label: 'Decisions', icon: BookOpen },
  { href: '/knowledge', label: 'Knowledge', icon: FileText },
]

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

const CRITICAL_DOC_ROLES: DocRole[] = ['handoff_document', 'implementation_blueprint']

const CRITICAL_ROLE_LABELS: Record<DocRole, string> = {
  handoff_document:         'handoff',
  implementation_blueprint: 'blueprint',
  ux_notes:                 'UX notes',
  decisions_log:            'decisions',
  execution_board:          'exec board',
  release_notes:            'release notes',
  deployment_report:        'deployment',
  recovery_report:          'recovery',
}

/* ── NavItem ───────────────────────────────────────────────── */

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span>{label}</span>
    </Link>
  )
}

/* ── SectionLabel ──────────────────────────────────────────── */

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn(
      'mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
      className,
    )}>
      {children}
    </p>
  )
}

/* ── Sidebar ───────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname()
  const { projects, load } = useProjectsStore()
  const { items: knowledgeItems, load: loadKnowledge } = useKnowledgeStore()
  const [knowledgeInitialized, setKnowledgeInitialized] = useState(false)

  useEffect(() => { load() }, [load])

  useEffect(() => {
    loadKnowledge().then(() => setKnowledgeInitialized(true))
  }, [loadKnowledge])

  /* Command center derived data — no new queries, all from store state */
  const activeCount  = projects.filter((p) => p.status === 'active').length
  const blockedCount = projects.filter((p) => p.status === 'blocked').length

  const hotProjects = projects
    .filter(
      (p) =>
        (p.priority === 'critical' || p.priority === 'high') &&
        (p.status === 'active' || p.status === 'scoped'),
    )
    .slice(0, 4)

  const blockedProjects = projects
    .filter((p) => p.status === 'blocked')
    .slice(0, 4)

  const nextActionItems = projects
    .filter((p) => p.next_action && (p.status === 'active' || p.status === 'scoped'))
    .sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    )
    .slice(0, 4)

  /* Docs Missing — active/scoped projects missing critical doc roles */
  const docsMissingProjects = knowledgeInitialized
    ? projects
        .filter((p) => p.status === 'active' || p.status === 'scoped')
        .map((p) => {
          const projectDocs = knowledgeItems.filter(
            (k) => k.project_id === p.id && k.doc_role,
          )
          const missing = CRITICAL_DOC_ROLES.filter(
            (role) => !projectDocs.some((k) => k.doc_role === role),
          )
          return { project: p, missing }
        })
        .filter((x) => x.missing.length > 0)
        .slice(0, 3)
    : []

  const hasCommandData = projects.length > 0

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight">PM Platform</span>
      </div>

      {/* Core navigation — shrink-0 so command center can grow below */}
      <nav className="flex shrink-0 flex-col gap-px p-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Portfolio Command Center — flex-1 fills remaining space, scrolls if needed */}
      {hasCommandData && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-sidebar-border px-3 py-3">
          {/* Portfolio pulse */}
          <div>
            <SectionLabel>Portfolio</SectionLabel>
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{projects.length}</span>{' '}
                total
              </span>
              <span>
                <span className="font-semibold text-emerald-700">{activeCount}</span>{' '}
                active
              </span>
              <span>
                <span className="font-semibold text-red-600">{blockedCount}</span>{' '}
                blocked
              </span>
            </div>
          </div>

          {/* High-priority projects */}
          {hotProjects.length > 0 && (
            <div>
              <SectionLabel>High Priority</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {hotProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group rounded px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
                  >
                    <p className="text-[11px] font-medium leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                      {p.name}
                    </p>
                    {p.next_action && (
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-1">
                        → {p.next_action}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Blocked projects */}
          {blockedProjects.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                <SectionLabel className="mb-0 text-red-600">Blocked</SectionLabel>
              </div>
              <div className="flex flex-col gap-0.5">
                {blockedProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group rounded px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
                  >
                    <p className="text-[11px] font-medium leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                      {p.name}
                    </p>
                    {p.blocked_reason && (
                      <p className="mt-0.5 text-[10px] leading-snug text-red-600/80 line-clamp-1">
                        {p.blocked_reason}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Docs Missing */}
          {docsMissingProjects.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1">
                <FileX className="h-2.5 w-2.5 text-amber-500" />
                <SectionLabel className="mb-0 text-amber-600">Docs Missing</SectionLabel>
              </div>
              <div className="flex flex-col gap-0.5">
                {docsMissingProjects.map(({ project, missing }) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}?tab=knowledge`}
                    className="group rounded px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
                  >
                    <p className="text-[11px] font-medium leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                      {project.name}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-amber-600/80 line-clamp-1">
                      Missing: {missing.map((r) => CRITICAL_ROLE_LABELS[r]).join(', ')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Next actions */}
          {nextActionItems.length > 0 && (
            <div>
              <SectionLabel>Next Actions</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {nextActionItems.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group rounded px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
                  >
                    <p className="text-[11px] font-medium leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                      {p.next_action}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-1">
                      {p.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom — settings, always pinned */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href}
          />
        ))}
      </div>
    </aside>
  )
}
