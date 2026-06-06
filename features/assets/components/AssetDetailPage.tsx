'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAssetsStore } from '@/store/assets.store'
import { useProjectsStore } from '@/store/projects.store'
import { AssetsRepository } from '@/data/repositories/assets.repository'
import { TopBar } from '@/components/layout/TopBar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, MoreHorizontal, Trash2, Loader2, Copy, LinkIcon, XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AIAsset, AssetType, AssetStatus } from '@/types/entities'

const TYPE_CONFIG: Record<AssetType, { label: string; color: string }> = {
  prompt:       { label: 'Prompt',       color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  agent:        { label: 'Agent',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  gpt:          { label: 'GPT',          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  workflow:     { label: 'Workflow',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  tool:         { label: 'Tool',         color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400' },
  model_config: { label: 'Model Config', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
}

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'idea',       label: 'Idea' },
  { value: 'draft',      label: 'Draft' },
  { value: 'active',     label: 'Active' },
  { value: 'deprecated', label: 'Deprecated' },
]

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'prompt',       label: 'Prompt' },
  { value: 'agent',        label: 'Agent' },
  { value: 'gpt',          label: 'GPT' },
  { value: 'workflow',     label: 'Workflow' },
  { value: 'tool',         label: 'Tool' },
  { value: 'model_config', label: 'Model Config' },
]

function TypeBadge({ type }: { type: AssetType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.label}
    </span>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-3 last:border-0">
      <span className="w-24 shrink-0 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

interface AssetDetailPageProps {
  assetId: string
}

export function AssetDetailPage({ assetId }: AssetDetailPageProps) {
  const router  = useRouter()
  const { assets, isLoading, load, update, remove, duplicate, linkToProject, unlinkFromProject } = useAssetsStore()
  const { projects, load: loadProjects } = useProjectsStore()

  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [linkOpen,      setLinkOpen]      = useState(false)
  const [linkedIds,     setLinkedIds]     = useState<string[]>([])
  const [selectedProj,  setSelectedProj]  = useState('')

  useEffect(() => {
    if (assets.length === 0) load()
    if (projects.length === 0) loadProjects()
  }, [assets.length, projects.length, load, loadProjects])

  useEffect(() => {
    AssetsRepository.getLinkedProjectIds(assetId).then(setLinkedIds)
  }, [assetId])

  const asset = assets.find((a) => a.id === assetId)

  async function handleDelete() {
    if (!asset) return
    setDeleting(true)
    try {
      await remove(asset.id)
      router.push('/assets')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handleDuplicate() {
    if (!asset) return
    const copy = await duplicate(asset.id)
    router.push(`/assets/${copy.id}`)
  }

  async function handleLink() {
    if (!selectedProj || !asset) return
    await linkToProject(asset.id, selectedProj)
    setLinkedIds((prev) => [...prev, selectedProj])
    setLinkOpen(false)
    setSelectedProj('')
  }

  async function handleUnlink(projectId: string) {
    if (!asset) return
    await unlinkFromProject(asset.id, projectId)
    setLinkedIds((prev) => prev.filter((id) => id !== projectId))
  }

  if (isLoading && assets.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (!asset) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="Asset not found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">This asset does not exist.</p>
          <Link href="/assets" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Assets
          </Link>
        </div>
      </div>
    )
  }

  const linkedProjects = projects.filter((p) => linkedIds.includes(p.id))
  const unlinkable     = projects.filter((p) => !linkedIds.includes(p.id))

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={
            <span className="flex items-center gap-1.5 text-sm">
              <Link href="/assets" className="font-normal text-muted-foreground hover:text-foreground transition-colors">
                AI Assets
              </Link>
              <span className="text-muted-foreground/50 select-none">/</span>
              <span className="font-semibold text-foreground">{asset.name}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/assets/${asset.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Edit
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/assets" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Assets
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* Main content */}
              <div className="space-y-6 lg:col-span-2">
                {asset.description && (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h2>
                    <p className="text-sm leading-relaxed text-foreground">{asset.description}</p>
                  </section>
                )}

                {asset.content && (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</h2>
                    <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm font-mono leading-relaxed text-foreground overflow-x-auto">
                      {asset.content}
                    </pre>
                  </section>
                )}

                {!asset.description && !asset.content && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No content yet.{' '}
                      <Link href={`/assets/${asset.id}/edit`} className="text-primary hover:underline">
                        Add description and content →
                      </Link>
                    </p>
                  </div>
                )}

                {/* Linked projects */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Linked Projects ({linkedProjects.length})
                    </h2>
                    <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                      <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                      Link Project
                    </Button>
                  </div>

                  {linkedProjects.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">Not linked to any projects.</p>
                  ) : (
                    <div className="rounded-lg border border-border bg-card">
                      {linkedProjects.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                          <Link href={`/projects/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                            {p.name}
                          </Link>
                          <button
                            onClick={() => handleUnlink(p.id)}
                            title="Unlink"
                            className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Meta panel */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4">
                  <MetaRow label="Type">
                    <Select
                      value={asset.asset_type}
                      onValueChange={(v) => v && update(asset.id, { asset_type: v as AssetType })}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ml-1">
                        <TypeBadge type={asset.asset_type} />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  <MetaRow label="Status">
                    <Select
                      value={asset.status}
                      onValueChange={(v) => v && update(asset.id, { status: v as AssetStatus })}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ml-1">
                        <span className="text-sm">{STATUS_OPTIONS.find((o) => o.value === asset.status)?.label}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  <MetaRow label="Created">
                    <span className="text-sm text-foreground">{format(new Date(asset.created_at), 'MMM d, yyyy')}</span>
                  </MetaRow>
                  <MetaRow label="Updated">
                    <span className="text-sm text-foreground">{format(new Date(asset.updated_at), 'MMM d, yyyy')}</span>
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
            <DialogTitle>Delete asset?</DialogTitle>
            <DialogDescription>
              <strong>{asset.name}</strong> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link project dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Project</DialogTitle>
          </DialogHeader>
          <Select value={selectedProj} onValueChange={(v) => v && setSelectedProj(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {unlinkable.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleLink} disabled={!selectedProj}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
