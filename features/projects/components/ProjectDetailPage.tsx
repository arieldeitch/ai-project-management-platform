'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectsStore } from '@/store/projects.store'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
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
import { ArrowLeft, MoreHorizontal, Pencil, Archive, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
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
    <div className="flex items-start gap-4 py-3 border-b border-border last:border-0">
      <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

interface ProjectDetailPageProps {
  projectId: string
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const router = useRouter()
  const { projects, isLoading, load, update, remove } = useProjectsStore()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  useEffect(() => {
    if (projects.length === 0) load()
  }, [projects.length, load])

  const project = projects.find((p) => p.id === projectId)

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || statusChanging) return
    setStatusChanging(true)
    try {
      await update(project.id, { status: newStatus })
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
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
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

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={project.name}
          actions={
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${project.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
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

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </h2>
                  {project.description ? (
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No description yet.</p>
                  )}
                </section>

                {/* Next action */}
                {project.next_action && (
                  <section>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Next Action
                    </h2>
                    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
                      <span className="mt-0.5 text-sm font-medium text-foreground">→</span>
                      <p className="text-sm text-foreground">{project.next_action}</p>
                    </div>
                  </section>
                )}
              </div>

              {/* Meta panel */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4">
                  <MetaRow label="Status">
                    <div className="flex items-center gap-2">
                      {statusChanging ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Select
                          value={project.status}
                          onValueChange={(v) => handleStatusChange(v as ProjectStatus)}
                        >
                          <SelectTrigger className="h-7 w-full border-0 bg-transparent p-0 text-xs shadow-none focus:ring-0">
                            <StatusBadge status={project.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </MetaRow>

                  <MetaRow label="Priority">
                    <PriorityBadge priority={project.priority} />
                  </MetaRow>

                  <MetaRow label="Created">
                    <span className="text-sm text-foreground">
                      {format(new Date(project.created_at), 'MMM d, yyyy')}
                    </span>
                  </MetaRow>

                  <MetaRow label="Updated">
                    <span className="text-sm text-foreground">
                      {format(new Date(project.updated_at), 'MMM d, yyyy')}
                    </span>
                  </MetaRow>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
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
