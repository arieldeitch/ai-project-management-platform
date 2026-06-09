'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProjectsStore } from '@/store/projects.store'
import { useKnowledgeStore } from '@/store/knowledge.store'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Bot,
  BookOpen, FileText, Settings, Sparkles, AlertTriangle, FileX, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectPriority, DocRole } from '@/types/entities'
import { getDraftCompletionStatus, LIFECYCLE_SEQUENCE } from '@/lib/workflow/governance'

/* ── nav config ────────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'לוח בקרה',   icon: LayoutDashboard },
  { href: '/daily-focus', label: 'מיקוד יומי', icon: Target },
  { href: '/projects',    label: 'פרויקטים',   icon: FolderKanban },
  { href: '/tasks',       label: 'משימות',      icon: CheckSquare },
  { href: '/assets',      label: 'נכסי AI',     icon: Bot },
  { href: '/decisions',   label: 'החלטות',      icon: BookOpen },
  { href: '/knowledge',   label: 'ידע',         icon: FileText },
]

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'הגדרות', icon: Settings },
]

const PRIORITY_ORDER: ProjectPriority[] = ['critical', 'high', 'medium', 'low', 'unset']

const CRITICAL_DOC_ROLES: DocRole[] = ['gpt_specification', 'handoff_document', 'implementation_blueprint']

const CRITICAL_ROLE_LABELS: Record<DocRole, string> = {
  gpt_specification:        'מפרט GPT',
  handoff_document:         'מסירה',
  implementation_blueprint: 'תכנית',
  ux_notes:                 'הערות UX',
  decisions_log:            'החלטות',
  execution_board:          'לוח ביצוע',
  release_notes:            'הערות גרסה',
  deployment_report:        'פריסה',
  recovery_report:          'שחזור',
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

  const IN_PROGRESS_STATUSES = new Set(['active', 'in_development', 'testing', 'deployed'])
  const activeCount  = projects.filter((p) => IN_PROGRESS_STATUSES.has(p.status)).length
  const blockedCount = projects.filter((p) => p.status === 'blocked').length

  const hotProjects = projects
    .filter(
      (p) =>
        (p.priority === 'critical' || p.priority === 'high') &&
        LIFECYCLE_SEQUENCE.includes(p.status as typeof LIFECYCLE_SEQUENCE[number]) &&
        p.status !== 'draft',
    )
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
    .slice(0, 4)

  const blockedProjects = projects
    .filter((p) => p.status === 'blocked')
    .slice(0, 4)

  const nextActionItems = projects
    .filter((p) => p.next_action && IN_PROGRESS_STATUSES.has(p.status))
    .sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    )
    .slice(0, 4)

  const docsMissingProjects = knowledgeInitialized
    ? projects
        .filter((p) => LIFECYCLE_SEQUENCE.includes(p.status as typeof LIFECYCLE_SEQUENCE[number]) && p.status !== 'draft')
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

  const gptMissingProjects = projects
    .filter((p) => p.status === 'gpt_setup' && (!p.assigned_gpt || !p.gpt_role || !p.knowledge_uploaded))
    .slice(0, 3)

  const draftIncompleteProjects = projects
    .filter((p) => p.status === 'draft')
    .map((p) => {
      const { missing } = getDraftCompletionStatus(p)
      return { project: p, missingCount: missing.length }
    })
    .filter((x) => x.missingCount > 0)
    .slice(0, 3)

  const hasCommandData = projects.length > 0

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-e border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight">PM Platform</span>
      </div>

      {/* Core navigation */}
      <nav className="flex shrink-0 flex-col gap-px p-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Portfolio Command Center */}
      {hasCommandData && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-sidebar-border px-3 py-3">
          {/* Portfolio pulse */}
          <div>
            <SectionLabel>פורטפוליו</SectionLabel>
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{projects.length}</span>{' '}
                סה&quot;כ
              </span>
              <span>
                <span className="font-semibold text-emerald-700">{activeCount}</span>{' '}
                פעיל
              </span>
              <span>
                <span className="font-semibold text-red-600">{blockedCount}</span>{' '}
                חסום
              </span>
            </div>
          </div>

          {/* High-priority projects */}
          {hotProjects.length > 0 && (
            <div>
              <SectionLabel>עדיפות גבוהה</SectionLabel>
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
                        {p.next_action}
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
                <SectionLabel className="mb-0 text-red-600">חסום</SectionLabel>
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
                <SectionLabel className="mb-0 text-amber-600">מסמכים חסרים</SectionLabel>
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
                      חסרים: {missing.map((r) => CRITICAL_ROLE_LABELS[r]).join(', ')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* GPT Setup incomplete */}
          {gptMissingProjects.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1">
                <Bot className="h-2.5 w-2.5 text-purple-500" />
                <SectionLabel className="mb-0 text-purple-600">GPT חסר</SectionLabel>
              </div>
              <div className="flex flex-col gap-0.5">
                {gptMissingProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group rounded px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
                  >
                    <p className="text-[11px] font-medium leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-purple-600/80 line-clamp-1">
                      {!p.assigned_gpt ? 'GPT לא משויך' : !p.gpt_role ? 'תפקיד GPT חסר' : 'ידע לא הועלה'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Draft fields incomplete */}
          {draftIncompleteProjects.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1">
                <FileX className="h-2.5 w-2.5 text-zinc-400" />
                <SectionLabel className="mb-0 text-zinc-500">טיוטות לא מלאות</SectionLabel>
              </div>
              <div className="flex flex-col gap-0.5">
                {draftIncompleteProjects.map(({ project, missingCount }) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group rounded px-1.5 py-1 transition-colors hover:bg-sidebar-accent/60"
                  >
                    <p className="text-[11px] font-medium leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                      {project.name}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 line-clamp-1">
                      {missingCount} שדות חסרים
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Next actions */}
          {nextActionItems.length > 0 && (
            <div>
              <SectionLabel>פעולות הבאות</SectionLabel>
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
