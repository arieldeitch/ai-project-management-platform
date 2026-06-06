'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDecisionsStore } from '@/store/decisions.store'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'
import { BookOpen, Plus, ChevronLeft, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { DecisionStatus } from '@/types/entities'

const STATUS_CONFIG: Record<DecisionStatus, { label: string; color: string }> = {
  active:     { label: 'פעיל',    color: 'text-emerald-600 dark:text-emerald-400' },
  superseded: { label: 'הוחלף',  color: 'text-amber-600 dark:text-amber-400 line-through' },
  reversed:   { label: 'בוטל',   color: 'text-red-600 dark:text-red-400 line-through' },
}

type StatusFilter = 'all' | DecisionStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'הכל' },
  { value: 'active',    label: 'פעיל' },
  { value: 'superseded',label: 'הוחלף' },
  { value: 'reversed',  label: 'בוטל' },
]

export function DecisionsListPage() {
  const { decisions, isLoading, load, remove } = useDecisionsStore()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => { load() }, [load])

  const filtered =
    statusFilter === 'all' ? decisions : decisions.filter((d) => d.status === statusFilter)

  function count(s: StatusFilter) {
    return s === 'all' ? decisions.length : decisions.filter((d) => d.status === s).length
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="החלטות"
        actions={
          <Link href="/decisions/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            החלטה חדשה
          </Link>
        }
      />

      {/* Status tabs */}
      <div className="flex items-stretch border-b border-border bg-background px-6">
        {STATUS_TABS.map((tab) => {
          const c = count(tab.value)
          if (tab.value !== 'all' && c === 0) return null
          const isActive = statusFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
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
            icon={<BookOpen className="h-12 w-12" />}
            title="אין החלטות עדיין"
            description="תעד החלטה ארכיטקטונית או אסטרטגית."
            action={
              <Link href="/decisions/new" className={cn(buttonVariants({ size: 'sm' }))}>
                <Plus className="me-1.5 h-3.5 w-3.5" /> החלטה חדשה
              </Link>
            }
          />
        ) : (
          <div>
            {filtered.map((d) => {
              const cfg = STATUS_CONFIG[d.status]
              const updatedAt = formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })
              return (
                <div key={d.id} className="group flex items-start gap-4 border-b border-border px-6 py-3.5 last:border-0 hover:bg-muted/40 transition-colors">
                  <Link href={`/decisions/${d.id}`} className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-medium text-foreground group-hover:text-primary', d.status !== 'active' && 'opacity-60')}>
                          {d.title}
                        </span>
                        <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                      </div>
                      {d.decision_made && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">→ {d.decision_made}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block w-24 text-end">{updatedAt}</span>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                  <button
                    onClick={() => remove(d.id)}
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
