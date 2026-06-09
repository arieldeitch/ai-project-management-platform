'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { useDailyFocusStore } from '@/store/dailyFocus.store'
import { TaskForm } from '@/features/tasks/components/TaskForm'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { DailyFocus, Task } from '@/types/entities'

function todayDate() { return new Date().toISOString().split('T')[0] }

const STATUS_CONFIG: Record<DailyFocus['status'], { label: string; className: string }> = {
  active:   { label: 'פעיל', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  done:     { label: 'בוצע', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  deferred: { label: 'נדחה', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
}

/* ── FocusCard ─────────────────────────────────────────────── */

interface FocusCardProps {
  focus: DailyFocus
  projectName: string
}

function FocusCard({ focus, projectName }: FocusCardProps) {
  const { updateFocus, deleteFocus, markDone, markDeferred } = useDailyFocusStore()

  const [editing,      setEditing]      = useState(false)
  const [editTitle,    setEditTitle]    = useState(focus.title)
  const [editNote,     setEditNote]     = useState(focus.note)
  const [editSaving,   setEditSaving]   = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const config = STATUS_CONFIG[focus.status]
  const timeStr = format(new Date(focus.created_at), 'HH:mm')

  async function handleSaveEdit() {
    if (!editTitle.trim()) return
    setEditSaving(true)
    try {
      await updateFocus(focus.id, { title: editTitle.trim(), note: editNote })
      setEditing(false)
    } finally {
      setEditSaving(false)
    }
  }

  function handleCancelEdit() {
    setEditing(false)
    setEditTitle(focus.title)
    setEditNote(focus.note)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteFocus(focus.id)
    } finally {
      setDeleting(false)
    }
  }

  async function handleTaskCreated(task: Task) {
    await updateFocus(focus.id, { created_task_id: task.id })
    setCreatingTask(false)
  }

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 space-y-3 transition-opacity',
      focus.status !== 'active' && 'opacity-65',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-muted-foreground font-medium truncate">{projectName}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0', config.className)}>
              {config.label}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2.5">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm"
                autoFocus
              />
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
                className="text-sm resize-none"
                placeholder="הערה..."
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={editSaving || !editTitle.trim()}>
                  {editSaving && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
                  שמור
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground leading-snug">{focus.title}</p>
              {focus.note && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{focus.note}</p>
              )}
            </>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">{timeStr}</span>
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-border/50">
          {focus.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/40"
                onClick={() => markDone(focus.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                סמן כבוצע
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-950/40"
                onClick={() => markDeferred(focus.id)}
              >
                <Clock className="h-3.5 w-3.5" />
                דחה
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            ערוך
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />
            }
            מחק
          </Button>

          {/* Create task — pushed to the end */}
          <div className="ms-auto">
            {focus.created_task_id ? (
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
              >
                <CheckCircle2 className="h-3 w-3" />
                נוצרה משימה
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setCreatingTask(!creatingTask)}
              >
                <Plus className="h-3.5 w-3.5" />
                צור משימה
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Inline task creation panel */}
      {creatingTask && (
        <div className="rounded-lg border border-border bg-background p-4 mt-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">צור משימה ממיקוד זה</p>
            <button
              type="button"
              onClick={() => setCreatingTask(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <TaskForm
            projectId={focus.project_id}
            initialTitle={focus.title}
            initialNotes={focus.note}
            onClose={() => setCreatingTask(false)}
            onCreated={handleTaskCreated}
          />
        </div>
      )}
    </div>
  )
}

/* ── DailyFocusPage ────────────────────────────────────────── */

export function DailyFocusPage() {
  const { projects, load: loadProjects } = useProjectsStore()
  const { focuses, isLoading, loadToday, createFocus } = useDailyFocusStore()

  /* Add-focus form state */
  const [addProjectId,         setAddProjectId]         = useState('')
  const [addProjectSearch,     setAddProjectSearch]     = useState('')
  const [addProjectPickerOpen, setAddProjectPickerOpen] = useState(false)
  const [addTitle,             setAddTitle]             = useState('')
  const [addNote,              setAddNote]              = useState('')
  const [addSaving,            setAddSaving]            = useState(false)
  const [addError,             setAddError]             = useState<string | null>(null)

  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadToday()
    if (projects.length === 0) loadProjects()
  }, [loadToday, loadProjects, projects.length])

  /* Close project picker on outside click */
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setAddProjectPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === addProjectId) ?? null,
    [projects, addProjectId],
  )

  const filteredProjects = useMemo(
    () => addProjectSearch
      ? projects.filter((p) => p.name.toLowerCase().includes(addProjectSearch.toLowerCase()))
      : projects,
    [projects, addProjectSearch],
  )

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  )

  /* Stats */
  const activeCount   = focuses.filter((f) => f.status === 'active').length
  const doneCount     = focuses.filter((f) => f.status === 'done').length
  const deferredCount = focuses.filter((f) => f.status === 'deferred').length
  const tasksCreated  = focuses.filter((f) => f.created_task_id).length

  async function handleAddFocus(e: React.FormEvent) {
    e.preventDefault()
    if (!addProjectId) { setAddError('יש לבחור פרויקט'); return }
    if (!addTitle.trim()) { setAddError('יש להזין כותרת'); return }

    setAddSaving(true)
    setAddError(null)
    try {
      await createFocus({
        project_id: addProjectId,
        title: addTitle.trim(),
        note: addNote,
        status: 'active',
        focus_date: todayDate(),
      })
      setAddProjectId('')
      setAddProjectSearch('')
      setAddTitle('')
      setAddNote('')
    } catch (err) {
      setAddError(String(err))
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar title="מיקוד יומי" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground">על מה אני רוצה להתקדם היום?</p>

          {/* Section 4 — Insights */}
          <div className="grid grid-cols-4 gap-3">
            {([
              { label: 'מיקודים פעילים', value: activeCount,   color: 'text-blue-600' },
              { label: 'הושלמו',          value: doneCount,     color: 'text-emerald-600' },
              { label: 'נדחו',            value: deferredCount, color: 'text-amber-600' },
              { label: 'משימות שנוצרו',   value: tasksCreated,  color: 'text-violet-600' },
            ] as const).map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-3 text-center">
                <div className={cn('text-2xl font-bold tabular-nums', stat.color)}>{stat.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Section 1 — Add focus */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-[13px] font-semibold">הוסף מיקוד יומי</h2>
            <form onSubmit={handleAddFocus} className="space-y-4">

              {/* Searchable project picker */}
              <div className="space-y-1.5" ref={pickerRef}>
                <Label>
                  פרויקט <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={selectedProject ? selectedProject.name : addProjectSearch}
                    onChange={(e) => {
                      setAddProjectSearch(e.target.value)
                      setAddProjectId('')
                      setAddProjectPickerOpen(true)
                    }}
                    onFocus={() => setAddProjectPickerOpen(true)}
                    placeholder="חפש ובחר פרויקט..."
                    className={cn(selectedProject && 'font-medium')}
                  />
                  {addProjectPickerOpen && filteredProjects.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-52 overflow-y-auto">
                      {filteredProjects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setAddProjectId(p.id)
                            setAddProjectSearch('')
                            setAddProjectPickerOpen(false)
                          }}
                          className="block w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="focus-title">
                  כותרת <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="focus-title"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="על מה אני רוצה להתקדם?"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="focus-note">הערה</Label>
                <Textarea
                  id="focus-note"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="הקשר, מטרה, שאלה פתוחה..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {addError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{addError}</p>
              )}

              <Button type="submit" size="sm" disabled={addSaving}>
                {addSaving
                  ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                  : <Plus className="me-1.5 h-3.5 w-3.5" />
                }
                הוסף למיקוד היומי
              </Button>
            </form>
          </div>

          {/* Section 2 — Today's focus list */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold">מיקודים להיום</h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                טוען...
              </div>
            ) : focuses.length === 0 ? (
              <EmptyState
                icon={<Target className="h-10 w-10" />}
                title="אין מיקודים להיום"
                description="הוסף את המיקוד הראשון שלך למעלה"
              />
            ) : (
              focuses.map((focus) => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  projectName={projectMap.get(focus.project_id) ?? 'פרויקט לא ידוע'}
                />
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
