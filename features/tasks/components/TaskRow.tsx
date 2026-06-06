'use client'

import { useState } from 'react'
import { useTasksStore } from '@/store/tasks.store'
import { useProjectsStore } from '@/store/projects.store'
import { TASK_STATUS_CONFIG } from '@/lib/constants/task-statuses'
import { TaskForm } from './TaskForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/entities'

interface TaskRowProps {
  task: Task
  showProject?: boolean
}

export function TaskRow({ task, showProject = false }: TaskRowProps) {
  const { cycleStatus, update, remove } = useTasksStore()
  const { projects } = useProjectsStore()
  const [editing,      setEditing]      = useState(false)
  const [blockOpen,    setBlockOpen]    = useState(false)
  const [blockReason,  setBlockReason]  = useState('')
  const [cycling,      setCycling]      = useState(false)
  const [deleteOpen,   setDeleteOpen]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const config  = TASK_STATUS_CONFIG[task.status]
  const project = showProject ? projects.find((p) => p.id === task.project_id) : null

  async function handleCycle() {
    if (task.status === 'in_progress') {
      setCycling(true)
      await cycleStatus(task.id)
      setCycling(false)
      return
    }
    setCycling(true)
    await cycleStatus(task.id)
    setCycling(false)
  }

  async function handleBlock() {
    if (!blockReason.trim()) return
    await update(task.id, { status: 'blocked', blocked_reason: blockReason.trim() })
    setBlockOpen(false)
    setBlockReason('')
  }

  async function handleDelete() {
    setDeleting(true)
    await remove(task.id)
    setDeleting(false)
    setDeleteOpen(false)
  }

  if (editing) {
    return (
      <div className="border-b border-border bg-muted/30 px-4 py-3 last:border-0">
        <TaskForm
          task={task}
          projectId={task.project_id}
          onClose={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <>
      <div className="group flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30 transition-colors">
        {/* Status icon */}
        <button
          onClick={handleCycle}
          disabled={cycling}
          title="לחץ לעדכון סטטוס"
          className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70', config.color)}
        >
          {cycling ? <Loader2 className="h-4 w-4 animate-spin" /> : config.icon}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            {task.task_type === 'feature' && (
              <span className="shrink-0 rounded px-1 py-0 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                פיצ&apos;ר
              </span>
            )}
            {task.task_type === 'bug' && (
              <span className={cn(
                'shrink-0 rounded px-1 py-0 text-[10px] font-semibold',
                task.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                task.severity === 'high'     ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
              )}>
                באג{task.severity ? ` · ${
                  task.severity === 'critical' ? 'קריטי' :
                  task.severity === 'high' ? 'גבוה' :
                  task.severity === 'medium' ? 'בינוני' : 'נמוך'
                }` : ''}
              </span>
            )}
            <span
              className={cn(
                'text-sm font-medium',
                task.status === 'done'
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}
            >
              {task.title}
            </span>
            {task.task_type === 'feature' && task.scope && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                [{task.scope === 'mvp' ? 'MVP' : task.scope === 'later' ? 'מאוחר' : 'נדחה'}]
              </span>
            )}
          </div>
          {showProject && project && (
            <span className="ms-2 text-xs text-muted-foreground">{project.name}</span>
          )}
          {task.blocked_reason && task.status === 'blocked' && (
            <p className="mt-0.5 text-xs text-red-500/80">⊘ {task.blocked_reason}</p>
          )}
          {task.task_type === 'feature' && task.acceptance_criteria && task.status !== 'done' && (
            <p className="mt-0.5 text-xs text-blue-600/70 dark:text-blue-400/70 line-clamp-1">
              ✓ {task.acceptance_criteria}
            </p>
          )}
          {task.notes && task.status !== 'done' && (
            <p className="mt-0.5 text-xs text-muted-foreground">{task.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
          {task.status !== 'blocked' && (
            <button
              onClick={() => setBlockOpen(true)}
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
              title="סמן כחסום"
            >
              חסום
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ערוך
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Block dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>למה זה חסום?</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="תאר את החוסם..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleBlock() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>ביטול</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={!blockReason.trim()}>
              סמן כחסום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחק משימה?</DialogTitle>
            <DialogDescription>לא ניתן לבטל פעולה זו.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>ביטול</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
