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
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectDomain,
  ProjectType,
} from '@/types/entities'

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

const DOMAIN_OPTIONS: { value: ProjectDomain; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'work',     label: 'Work' },
  { value: 'general',  label: 'General' },
]

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'software',       label: 'Software' },
  { value: 'ai_agent',       label: 'AI Agent' },
  { value: 'automation',     label: 'Automation' },
  { value: 'operations',     label: 'Operations' },
  { value: 'research',       label: 'Research' },
  { value: 'personal',       label: 'Personal' },
  { value: 'infrastructure', label: 'Infrastructure' },
]

interface ProjectFormProps {
  mode: 'create' | 'edit'
  project?: Project
}

export function ProjectForm({ mode, project }: ProjectFormProps) {
  const router = useRouter()
  const { create, update } = useProjectsStore()

  const [name,                 setName]               = useState(project?.name ?? '')
  const [description,          setDesc]               = useState(project?.description ?? '')
  const [goal,                 setGoal]               = useState(project?.goal ?? '')
  const [domain,               setDomain]             = useState<ProjectDomain | ''>(project?.domain ?? '')
  const [projectType,          setProjectType]        = useState<ProjectType | ''>(project?.project_type ?? '')
  const [status,               setStatus]             = useState<ProjectStatus>(project?.status ?? 'idea')
  const [priority,             setPriority]           = useState<ProjectPriority>(project?.priority ?? 'unset')
  const [currentPhase,         setCurrentPhase]       = useState(project?.current_phase ?? '')
  const [nextAction,           setNextAction]         = useState(project?.next_action ?? '')
  const [blockedReason,        setBlockedReason]      = useState(project?.blocked_reason ?? '')
  /* Execution Context */
  const [assignedGpt,          setAssignedGpt]        = useState(project?.assigned_gpt ?? '')
  const [primaryWorkspace,     setPrimaryWorkspace]   = useState(project?.primary_workspace ?? '')
  const [repositoryUrl,        setRepositoryUrl]      = useState(project?.repository_url ?? '')
  const [githubProjectName,    setGithubProjectName]  = useState(project?.github_project_name ?? '')
  const [localFolderPath,      setLocalFolderPath]    = useState(project?.local_folder_path ?? '')
  const [productionUrl,        setProductionUrl]      = useState(project?.production_url ?? '')
  const [lovableUrl,           setLovableUrl]         = useState(project?.lovable_url ?? '')
  const [vercelUrl,            setVercelUrl]          = useState(project?.vercel_url ?? '')
  const [currentExecutionPath, setCurrentExecutionPath] = useState(project?.current_execution_path ?? '')

  const [execContextOpen, setExecContextOpen] = useState(
    !!(project?.assigned_gpt || project?.primary_workspace || project?.repository_url)
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!project
  const backUrl = isEdit ? `/projects/${project.id}` : '/projects'
  const title   = isEdit ? 'Edit Project' : 'New Project'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required.'); return }
    if (status === 'blocked' && !blockedReason.trim()) {
      setError('Please describe why this project is blocked.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        description,
        goal,
        domain: domain || undefined,
        project_type: projectType || undefined,
        status,
        priority,
        current_phase: currentPhase,
        next_action: nextAction,
        blocked_reason: status === 'blocked' ? blockedReason : '',
        assigned_gpt: assignedGpt || undefined,
        primary_workspace: primaryWorkspace || undefined,
        repository_url: repositoryUrl || undefined,
        github_project_name: githubProjectName || undefined,
        local_folder_path: localFolderPath || undefined,
        production_url: productionUrl || undefined,
        lovable_url: lovableUrl || undefined,
        vercel_url: vercelUrl || undefined,
        current_execution_path: currentExecutionPath || undefined,
      }
      if (isEdit) {
        await update(project.id, payload)
        router.push(`/projects/${project.id}`)
      } else {
        const p = await create(payload)
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

            {/* Goal */}
            <div className="space-y-1.5">
              <Label htmlFor="goal">Goal / Objective</Label>
              <Input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What does success look like?"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Context, ideas, relevant details..."
                rows={4}
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type + Domain */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="project_type">Type</Label>
                <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
                  <SelectTrigger id="project_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="domain">Domain</Label>
                <Select value={domain} onValueChange={(v) => setDomain(v as ProjectDomain)}>
                  <SelectTrigger id="domain">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Phase */}
            <div className="space-y-1.5">
              <Label htmlFor="current_phase">Current Phase</Label>
              <Input
                id="current_phase"
                value={currentPhase}
                onChange={(e) => setCurrentPhase(e.target.value)}
                placeholder="e.g. Design, Development, Operational"
              />
            </div>

            {/* Next action */}
            <div className="space-y-1.5">
              <Label htmlFor="next_action">Next Action</Label>
              <Input
                id="next_action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="The immediate next step"
              />
            </div>

            {/* Blocked reason — only shown when status is blocked */}
            {status === 'blocked' && (
              <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                <Label htmlFor="blocked_reason" className="text-red-700 dark:text-red-400">
                  Blocked Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="blocked_reason"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="What is blocking this project? What needs to happen to unblock it?"
                  rows={3}
                />
              </div>
            )}

            {/* Execution Context — collapsible */}
            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setExecContextOpen(!execContextOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium">Execution Context</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {!execContextOpen && (assignedGpt || primaryWorkspace || repositoryUrl) && (
                    <span className="mr-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      filled
                    </span>
                  )}
                  {execContextOpen
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                  }
                </span>
              </button>

              {execContextOpen && (
                <div className={cn('space-y-4 border-t border-border px-4 pb-4 pt-4')}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="assigned_gpt">Assigned GPT</Label>
                      <Input
                        id="assigned_gpt"
                        value={assignedGpt}
                        onChange={(e) => setAssignedGpt(e.target.value)}
                        placeholder="e.g. Claude Sonnet 4.6"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="primary_workspace">Primary Workspace</Label>
                      <Input
                        id="primary_workspace"
                        value={primaryWorkspace}
                        onChange={(e) => setPrimaryWorkspace(e.target.value)}
                        placeholder="e.g. Claude Code CLI"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="repository_url">Repository URL</Label>
                      <Input
                        id="repository_url"
                        value={repositoryUrl}
                        onChange={(e) => setRepositoryUrl(e.target.value)}
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="github_project_name">GitHub Project Name</Label>
                      <Input
                        id="github_project_name"
                        value={githubProjectName}
                        onChange={(e) => setGithubProjectName(e.target.value)}
                        placeholder="owner/repo-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="local_folder_path">Local Folder Path</Label>
                    <Input
                      id="local_folder_path"
                      value={localFolderPath}
                      onChange={(e) => setLocalFolderPath(e.target.value)}
                      placeholder="C:/Users/..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="production_url">Production URL</Label>
                      <Input
                        id="production_url"
                        value={productionUrl}
                        onChange={(e) => setProductionUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vercel_url">Vercel URL</Label>
                      <Input
                        id="vercel_url"
                        value={vercelUrl}
                        onChange={(e) => setVercelUrl(e.target.value)}
                        placeholder="https://...vercel.app"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lovable_url">Lovable URL</Label>
                    <Input
                      id="lovable_url"
                      value={lovableUrl}
                      onChange={(e) => setLovableUrl(e.target.value)}
                      placeholder="https://...lovable.app"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="current_execution_path">Current Execution Path</Label>
                    <Input
                      id="current_execution_path"
                      value={currentExecutionPath}
                      onChange={(e) => setCurrentExecutionPath(e.target.value)}
                      placeholder="Active working session description..."
                    />
                  </div>
                </div>
              )}
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
