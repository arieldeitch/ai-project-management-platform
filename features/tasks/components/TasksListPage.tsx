'use client'

import { useEffect, useState } from 'react'
import { useTasksStore } from '@/store/tasks.store'
import { useProjectsStore } from '@/store/projects.store'
import { TaskRow } from './TaskRow'
import { TaskForm } from './TaskForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { CheckSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types/entities'

type ViewMode = 'all' | 'todo' | 'blocked' | 'done'

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'all',     label: 'הכל' },
  { value: 'todo',    label: 'פתוח' },
  { value: 'blocked', label: 'חסום' },
  { value: 'done',    label: 'הושלם' },
]

export function TasksListPage() {
  const { tasks, isLoading, load } = useTasksStore()
  const { projects, load: loadProjects } = useProjectsStore()
  const [view,       setView]       = useState<ViewMode>('todo')
  const [showForm,   setShowForm]   = useState(false)

  useEffect(() => {
    load()
    if (projects.length === 0) loadProjects()
  }, [load, loadProjects, projects.length])

  const OPEN_STATUSES: TaskStatus[] = ['todo', 'in_progress']

  const filtered = tasks.filter((t) => {
    if (view === 'todo')    return OPEN_STATUSES.includes(t.status)
    if (view === 'blocked') return t.status === 'blocked'
    if (view === 'done')    return t.status === 'done'
    return true
  })

  const projectGroups = new Map<string | null, typeof filtered>()
  filtered.forEach((t) => {
    const key = t.project_id
    if (!projectGroups.has(key)) projectGroups.set(key, [])
    projectGroups.get(key)!.push(t)
  })

  const openCount    = tasks.filter((t) => OPEN_STATUSES.includes(t.status)).length
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="משימות"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            משימה חדשה
          </Button>
        }
      />

      {/* View filter */}
      <div className="flex items-stretch border-b border-border bg-background px-6">
        {VIEW_OPTIONS.map((opt) => {
          const count =
            opt.value === 'all'     ? tasks.length :
            opt.value === 'todo'    ? openCount :
            opt.value === 'blocked' ? blockedCount :
            tasks.filter((t) => t.status === 'done').length
          const isActive = view === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {opt.label}
              {count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-4 space-y-4">

          {showForm && (
            <div className="rounded-lg border border-border bg-card p-4">
              <TaskForm onClose={() => setShowForm(false)} />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">טוען...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-12 w-12" />}
              title={view === 'done' ? 'אין משימות שהושלמו' : 'אין משימות כאן'}
              description={view === 'todo' ? 'צור את המשימה הראשונה שלך.' : undefined}
              action={
                view === 'todo' ? (
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="me-1.5 h-3.5 w-3.5" />
                    משימה חדשה
                  </Button>
                ) : undefined
              }
            />
          ) : (
            Array.from(projectGroups.entries()).map(([projectId, groupTasks]) => {
              const project = projectId ? projects.find((p) => p.id === projectId) : null
              return (
                <div key={projectId ?? 'unlinked'} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="border-b border-border bg-muted/30 px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {project ? project.name : 'ללא פרויקט'}
                    </span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {groupTasks.length === 1 ? 'משימה' : `${groupTasks.length} משימות`}
                    </span>
                  </div>
                  {groupTasks.map((t) => (
                    <TaskRow key={t.id} task={t} showProject={false} />
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
