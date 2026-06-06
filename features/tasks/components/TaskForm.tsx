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
import type { Task, TaskPriority } from '@/types/entities'

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high',   label: 'גבוה' },
  { value: 'medium', label: 'בינוני' },
  { value: 'low',    label: 'נמוך' },
]

interface TaskFormProps {
  projectId?: string | null
  task?: Task
  onClose: () => void
}

export function TaskForm({ projectId, task, onClose }: TaskFormProps) {
  const { create, update } = useTasksStore()
  const { projects } = useProjectsStore()

  const [title,         setTitle]         = useState(task?.title ?? '')
  const [notes,         setNotes]         = useState(task?.notes ?? '')
  const [priority,      setPriority]      = useState<TaskPriority>(task?.priority ?? 'medium')
  const [linkedProject, setLinkedProject] = useState<string>(task?.project_id ?? projectId ?? '')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const isEdit = !!task

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('כותרת המשימה נדרשת.'); return }

    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await update(task.id, {
          title: title.trim(),
          notes,
          priority,
          project_id: linkedProject || null,
        })
      } else {
        await create({
          title: title.trim(),
          notes,
          priority,
          status: 'todo',
          blocked_reason: '',
          project_id: linkedProject || null,
        })
      }
      onClose()
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">משימה <span className="text-destructive">*</span></Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="מה צריך לעשות?"
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
          {isEdit ? 'שמור' : 'הוסף משימה'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </form>
  )
}
