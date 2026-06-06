'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useKnowledgeStore } from '@/store/knowledge.store'
import { useProjectsStore } from '@/store/projects.store'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'
import { FileText, Plus, ChevronLeft, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { KnowledgeType, DocStatus } from '@/types/entities'

const TYPE_CONFIG: Record<KnowledgeType, { label: string; color: string }> = {
  note:      { label: 'הערה',   color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  reference: { label: 'הפניה',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  learning:  { label: 'למידה',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  process:   { label: 'תהליך',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  research:  { label: 'מחקר',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
}

const DOC_STATUS_CONFIG: Record<DocStatus, { label: string; color: string }> = {
  current:  { label: 'עדכני',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  draft:    { label: 'טיוטה',  color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  outdated: { label: 'מיושן',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
}

type TypeFilter = 'all' | 'docs' | KnowledgeType

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: 'all',       label: 'הכל' },
  { value: 'docs',      label: 'מסמכים' },
  { value: 'note',      label: 'הערות' },
  { value: 'reference', label: 'הפניות' },
  { value: 'learning',  label: 'למידה' },
  { value: 'process',   label: 'תהליכים' },
  { value: 'research',  label: 'מחקר' },
]

function TypeBadge({ type }: { type: KnowledgeType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.label}
    </span>
  )
}

function DocStatusBadge({ status }: { status: DocStatus }) {
  const cfg = DOC_STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.label}
    </span>
  )
}

export function KnowledgeListPage() {
  const { items, isLoading, load, remove } = useKnowledgeStore()
  const { projects, load: loadProjects } = useProjectsStore()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => {
    load()
    loadProjects()
  }, [load, loadProjects])

  const projectMap = new Map(projects.map((p) => [p.id, p.name]))

  const filtered =
    typeFilter === 'all'  ? items :
    typeFilter === 'docs' ? items.filter((i) => i.doc_role) :
    items.filter((i) => i.item_type === typeFilter)

  function count(t: TypeFilter) {
    if (t === 'all')  return items.length
    if (t === 'docs') return items.filter((i) => i.doc_role).length
    return items.filter((i) => i.item_type === t).length
  }

  // Doc health summary
  const docItems = items.filter((i) => i.doc_role)
  const docCurrent  = docItems.filter((i) => i.doc_status === 'current').length
  const docOutdated = docItems.filter((i) => i.doc_status === 'outdated').length
  const docDraft    = docItems.filter((i) => i.doc_status === 'draft').length

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="ידע"
        actions={
          <Link href="/knowledge/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            פריט חדש
          </Link>
        }
      />

      {/* Doc health panel */}
      {docItems.length > 0 && (
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-6 py-2">
          <span className="text-xs font-medium text-muted-foreground">בריאות תיעוד:</span>
          {docCurrent > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ {docCurrent} עדכני
            </span>
          )}
          {docOutdated > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
              ! {docOutdated} מיושן
            </span>
          )}
          {docDraft > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              ~ {docDraft} טיוטה
            </span>
          )}
        </div>
      )}

      {/* Type tabs */}
      <div className="flex items-stretch border-b border-border bg-background px-6 overflow-x-auto">
        {TYPE_TABS.map((tab) => {
          const c = count(tab.value)
          if (tab.value !== 'all' && c === 0) return null
          const isActive = typeFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>{c}</span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">טוען...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="אין פריטי ידע עדיין"
            description="תעד הערות, הפניות, תובנות, תהליכים ומחקרים."
            action={
              <Link href="/knowledge/new" className={cn(buttonVariants({ size: 'sm' }))}>
                <Plus className="me-1.5 h-3.5 w-3.5" /> פריט חדש
              </Link>
            }
          />
        ) : (
          <div>
            {filtered.map((item) => {
              const updatedAt = formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })
              const projectName = item.project_id ? projectMap.get(item.project_id) : null
              return (
                <div key={item.id} className="group flex items-start gap-4 border-b border-border px-6 py-3.5 last:border-0 hover:bg-muted/40 transition-colors">
                  <Link href={`/knowledge/${item.id}`} className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                          {item.title}
                        </span>
                        <TypeBadge type={item.item_type} />
                        {item.doc_status && <DocStatusBadge status={item.doc_status} />}
                      </div>
                      {projectName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{projectName}</p>
                      )}
                      {item.body && !projectName && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.body}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block w-24 text-end">{updatedAt}</span>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                  <button
                    onClick={() => remove(item.id)}
                    className="mt-0.5 rounded p-0.5 text-muted-foreground opacity-30 group-hover:opacity-100 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
