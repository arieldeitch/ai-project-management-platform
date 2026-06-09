'use client'

import { useState } from 'react'
import { useTasksStore } from '@/store/tasks.store'
import { useProjectsStore } from '@/store/projects.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority, TaskType, TaskScope, BugSeverity } from '@/types/entities'

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high',   label: 'גבוה' },
  { value: 'medium', label: 'בינוני' },
  { value: 'low',    label: 'נמוך' },
]

const TYPE_OPTIONS: { value: TaskType; label: string; description: string }[] = [
  { value: 'task',    label: 'משימה',  description: 'עבודה כללית' },
  { value: 'feature', label: 'פיצ\'ר', description: 'יכולת חדשה למוצר' },
  { value: 'bug',     label: 'באג',    description: 'תקלה לתיקון' },
]

const SCOPE_OPTIONS: { value: TaskScope; label: string }[] = [
  { value: 'mvp',      label: 'MVP' },
  { value: 'later',    label: 'מאוחר יותר' },
  { value: 'deferred', label: 'נדחה' },
]

const SEVERITY_OPTIONS: { value: BugSeverity; label: string }[] = [
  { value: 'critical', label: 'קריטי' },
  { value: 'high',     label: 'גבוה' },
  { value: 'medium',   label: 'בינוני' },
  { value: 'low',      label: 'נמוך' },
]

interface TaskFormProps {
  projectId?: string | null
  task?: Task
  initialTitle?: string
  initialNotes?: string
  onClose: () => void
  onCreated?: (task: Task) => void
}

export function TaskForm({ projectId, task, initialTitle, initialNotes, onClose, onCreated }: TaskFormProps) {
  const { create, update } = useTasksStore()
  const { projects } = useProjectsStore()

  const [title,         setTitle]         = useState(task?.title ?? initialTitle ?? '')
  const [notes,         setNotes]         = useState(task?.notes ?? initialNotes ?? '')
  const [priority,      setPriority]      = useState<TaskPriority>(task?.priority ?? 'medium')
  const [linkedProject, setLinkedProject] = useState<string>(task?.project_id ?? projectId ?? '')
  const [taskType,      setTaskType]      = useState<TaskType>(task?.task_type ?? 'task')
  /* Feature fields */
  const [userValue,         setUserValue]         = useState(task?.user_value ?? '')
  const [acceptanceCriteria,setAcceptanceCriteria]= useState(task?.acceptance_criteria ?? '')
  const [scope,             setScope]             = useState<TaskScope | ''>(task?.scope ?? '')
  /* Bug fields */
  const [severity,          setSeverity]          = useState<BugSeverity | ''>(task?.severity ?? '')
  const [stepsToReproduce,  setStepsToReproduce]  = useState(task?.steps_to_reproduce ?? '')
  const [expectedBehavior,  setExpectedBehavior]  = useState(task?.expected_behavior ?? '')
  const [actualBehavior,    setActualBehavior]    = useState(task?.actual_behavior ?? '')
  const [environment,       setEnvironment]       = useState(task?.environment ?? '')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const isEdit = !!task

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('כותרת המשימה נדרשת.'); return }

    setSaving(true)
    setError(null)
    try {
      const base = {
        title: title.trim(),
        notes,
        priority,
        project_id: linkedProject || null,
        task_type: taskType,
        user_value:          taskType === 'feature' ? (userValue || undefined) : undefined,
        acceptance_criteria: taskType === 'feature' ? (acceptanceCriteria || undefined) : undefined,
        scope:               taskType === 'feature' ? (scope as TaskScope || undefined) : undefined,
        severity:            taskType === 'bug' ? (severity as BugSeverity || undefined) : undefined,
        steps_to_reproduce:  taskType === 'bug' ? (stepsToReproduce || undefined) : undefined,
        expected_behavior:   taskType === 'bug' ? (expectedBehavior || undefined) : undefined,
        actual_behavior:     taskType === 'bug' ? (actualBehavior || undefined) : undefined,
        environment:         taskType === 'bug' ? (environment || undefined) : undefined,
      }
      if (isEdit) {
        await update(task.id, base)
      } else {
        const created = await create({
          ...base,
          status: 'todo',
          blocked_reason: '',
        })
        onCreated?.(created)
      }
      onClose()
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Task type selector */}
      <div className="flex gap-1.5">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTaskType(opt.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              taskType === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">
          {taskType === 'feature' ? 'שם הפיצ\'ר' : taskType === 'bug' ? 'תיאור הבאג' : 'משימה'}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            taskType === 'feature' ? 'מה הפיצ\'ר?' :
            taskType === 'bug'     ? 'מה לא עובד?' :
            'מה צריך לעשות?'
          }
          autoFocus
        />
      </div>

      {/* Project + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-project">פרויקט</Label>
          <Select value={linkedProject} onValueChange={(v) => setLinkedProject(v ?? '')}>
            <SelectTrigger id="task-project">
              <SelectValue placeholder="ללא פרויקט" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">ללא פרויקט</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-priority">עדיפות</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger id="task-priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Feature-specific fields */}
      {taskType === 'feature' && (
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900/30 dark:bg-blue-950/10">
          <div className="space-y-1.5">
            <Label htmlFor="user-value">ערך למשתמש</Label>
            <Input
              id="user-value"
              value={userValue}
              onChange={(e) => setUserValue(e.target.value)}
              placeholder="כמה זה שווה? למה זה חשוב?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acceptance-criteria">קריטריוני קבלה</Label>
            <Textarea
              id="acceptance-criteria"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              placeholder="מתי הפיצ'ר נחשב 'מוכן'? (נדרש למעבר לבדיקות)"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scope">סקופ</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as TaskScope)}>
              <SelectTrigger id="scope"><SelectValue placeholder="לא מוגדר" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">לא מוגדר</SelectItem>
                {SCOPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Bug-specific fields */}
      {taskType === 'bug' && (
        <div className="space-y-4 rounded-lg border border-red-200 bg-red-50/40 p-3 dark:border-red-900/30 dark:bg-red-950/10">
          <div className="space-y-1.5">
            <Label htmlFor="severity">חומרה</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
              <SelectTrigger id="severity"><SelectValue placeholder="בחר חומרה" /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="steps-to-reproduce">שלבים לשחזור</Label>
            <Textarea
              id="steps-to-reproduce"
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. כנס ל... 2. לחץ על... 3. ראה ש..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expected-behavior">התנהגות צפויה</Label>
              <Textarea
                id="expected-behavior"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="מה היה אמור לקרות?"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actual-behavior">התנהגות בפועל</Label>
              <Textarea
                id="actual-behavior"
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                placeholder="מה קורה בפועל?"
                rows={2}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="environment">סביבה</Label>
            <Input
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="לדוג' Chrome/Windows, dev server, production"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="task-notes">הערות</Label>
        <Textarea
          id="task-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="הקשר נוסף..."
          rows={2}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
          {isEdit ? 'שמור' : 'הוסף'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </form>
  )
}
