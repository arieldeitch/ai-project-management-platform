'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectsStore } from '@/store/projects.store'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Project, ProjectStatus, ProjectPriority } from '@/types/entities'

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'idea',      label: 'Idea' },
  { value: 'scoped',    label: 'Scoped' },
  { value: 'active',    label: 'Active' },
  { value: 'blocked',   label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred',  label: 'Deferred' },
  { value: 'archived',  label: 'Archived' },
]

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high',     label: 'High' },
  { value: 'medium',   label: 'Medium' },
  { value: 'low',      label: 'Low' },
  { value: 'unset',    label: 'No priority' },
]

interface ProjectFormProps {
  mode: 'create' | 'edit'
  project?: Project
}

export function ProjectForm({ mode, project }: ProjectFormProps) {
  const router = useRouter()
  const { create, update } = useProjectsStore()

  const [name, setName]             = useState(project?.name ?? '')
  const [description, setDesc]      = useState(project?.description ?? '')
  const [status, setStatus]         = useState<ProjectStatus>(project?.status ?? 'idea')
  const [priority, setPriority]     = useState<ProjectPriority>(project?.priority ?? 'unset')
  const [nextAction, setNextAction] = useState(project?.next_action ?? '')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!project
  const backUrl = isEdit ? `/projects/${project.id}` : '/projects'
  const title   = isEdit ? 'Edit Project' : 'New Project'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required.'); return }

    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await update(project.id, { name: name.trim(), description, status, priority, next_action: nextAction })
        router.push(`/projects/${project.id}`)
      } else {
        const p = await create({ name: name.trim(), description, status, priority, next_action: nextAction })
        router.push(`/projects/${p.id}`)
      }
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title={title}
        actions={
          <Link href={backUrl} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Habit Tracker App"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What is this project about?"
                rows={4}
              />
            </div>

            {/* Status + Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Next action */}
            <div className="space-y-1.5">
              <Label htmlFor="next_action">Next Action</Label>
              <Input
                id="next_action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="What is the immediate next step?"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Project'}
              </Button>
              <Link href={backUrl} className={buttonVariants({ variant: 'ghost' })}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
