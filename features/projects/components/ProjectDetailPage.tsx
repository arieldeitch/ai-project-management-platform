'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { DomainBadge } from '@/components/shared/DomainBadge'
import { TopBar } from '@/components/layout/TopBar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, MoreHorizontal, Pencil, Archive, Trash2, Loader2, AlertTriangle, Target } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/types/entities'

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'idea',      label: 'Idea' },
  { value: 'scoped',    label: 'Scoped' },
  { value: 'active',    label: 'Active' },
  { value: 'blocked',   label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred',  label: 'Deferred' },
  { value: 'archived',  label: 'Archived' },
]

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-3 last:border-0">
      <span className="w-28 shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  )
}

interface ProjectDetailPageProps {
  projectId: string
  activeTab?: string
}

export function ProjectDetailPage({ projectId, activeTab = 'overview' }: ProjectDetailPageProps) {
  const router = useRouter()
  const { projects, isLoading, load, update, remove } = useProjectsStore()
  const [deleteOpen,      setDeleteOpen]      = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [statusChanging,  setStatusChanging]  = useState(false)
  const [tab,             setTab]             = useState(activeTab)

  useEffect(() => { if (projects.length === 0) load() }, [projects.length, load])

  const project = projects.find((p) => p.id === projectId)

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || statusChanging) return
    setStatusChanging(true)
    try {
      await update(project.id, { status: newStatus, blocked_reason: newStatus !== 'blocked' ? '' : project.blocked_reason })
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleArchive() {
    if (!project) return
    await update(project.id, { status: 'archived' })
    router.push('/projects')
  }

  async function handleDelete() {
    if (!project) return
    setDeleting(true)
    try {
      await remove(project.id)
      router.push('/projects')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (isLoading && projects.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (!project) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="Project not found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">This project does not exist.</p>
          <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'overview',   label: 'Overview' },
    { id: 'tasks',      label: 'Tasks' },
    { id: 'assets',     label: 'AI Assets' },
    { id: 'decisions',  label: 'Decisions' },
    { id: 'knowledge',  label: 'Knowledge' },
  ]

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={project.name}
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/projects/${project.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleArchive} disabled={project.status === 'archived'}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/projects" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Projects
              </Link>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border bg-background px-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* Main content */}
              <div className="space-y-6 lg:col-span-2">

                {/* Blocked banner */}
                {project.status === 'blocked' && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Blocked</p>
                      {project.blocked_reason ? (
                        <p className="mt-0.5 text-sm text-red-600/80 dark:text-red-400/80">
                          {project.blocked_reason}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm text-red-500/70 italic">No reason recorded.</p>
                      )}
                    </div>
                  </div>
                )}

                {tab === 'overview' && (
                  <>
                    {/* Goal */}
                    {project.goal && (
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-primary" />
                          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goal</h2>
                        </div>
                        <p className="text-sm font-medium text-foreground">{project.goal}</p>
                      </section>
                    )}

                    {/* Description */}
                    <section>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Description
                      </h2>
                      {project.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {project.description}
                        </p>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">No description yet.</p>
                      )}
                    </section>

                    {/* Next action */}
                    {project.next_action && (
                      <section>
                        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Next Action
                        </h2>
                        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
                          <span className="mt-0.5 text-sm font-medium">→</span>
                          <p className="text-sm">{project.next_action}</p>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {tab === 'tasks' && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">Tasks coming in Phase 3.</p>
                  </div>
                )}
                {tab === 'assets' && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">AI Assets coming in Phase 4.</p>
                  </div>
                )}
                {tab === 'decisions' && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">Decisions coming in Phase 5.</p>
                  </div>
                )}
                {tab === 'knowledge' && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">Knowledge items coming in Phase 5.</p>
                  </div>
                )}
              </div>

              {/* Meta panel */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4">
                  <MetaRow label="Status">
                    {statusChanging ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Select
                        value={project.status}
                        onValueChange={(v) => handleStatusChange(v as ProjectStatus)}
                      >
                        <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ml-1">
                          <StatusBadge status={project.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </MetaRow>

                  <MetaRow label="Priority">
                    <PriorityBadge priority={project.priority} />
                  </MetaRow>

                  {project.domain && (
                    <MetaRow label="Domain">
                      <DomainBadge domain={project.domain} />
                    </MetaRow>
                  )}

                  {project.current_phase && (
                    <MetaRow label="Phase">
                      <span className="text-sm text-foreground">{project.current_phase}</span>
                    </MetaRow>
                  )}

                  <MetaRow label="Created">
                    <span className="text-foreground">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                  </MetaRow>

                  <MetaRow label="Updated">
                    <span className="text-foreground">{format(new Date(project.updated_at), 'MMM d, yyyy')}</span>
                  </MetaRow>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              <strong>{project.name}</strong> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
