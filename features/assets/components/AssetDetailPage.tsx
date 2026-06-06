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
  prompt:       { label: 'פרומפט',       color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  agent:        { label: 'סוכן',         color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  gpt:          { label: 'GPT',          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  workflow:     { label: 'תהליך',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  tool:         { label: 'כלי',          color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400' },
  model_config: { label: 'הגדרות מודל', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
}

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'idea',       label: 'רעיון' },
  { value: 'draft',      label: 'טיוטה' },
  { value: 'active',     label: 'פעיל' },
  { value: 'deprecated', label: 'לא בשימוש' },
]

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'prompt',       label: 'פרומפט' },
  { value: 'agent',        label: 'סוכן' },
  { value: 'gpt',          label: 'GPT' },
  { value: 'workflow',     label: 'תהליך' },
  { value: 'tool',         label: 'כלי' },
  { value: 'model_config', label: 'הגדרות מודל' },
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
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">טוען...</div>
  }

  if (!asset) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="נכס לא נמצא" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">נכס זה אינו קיים.</p>
          <Link href="/assets" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> חזרה לנכסים
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
                נכסי AI
              </Link>
              <span className="text-muted-foreground/50 select-none">/</span>
              <span className="font-semibold text-foreground">{asset.name}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/assets/${asset.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                ערוך
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="me-2 h-4 w-4" /> שכפל
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="me-2 h-4 w-4" /> מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/assets" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> נכסים
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
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">תיאור</h2>
                    <p className="text-sm leading-relaxed text-foreground">{asset.description}</p>
                  </section>
                )}

                {asset.content && (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">תוכן</h2>
                    <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm font-mono leading-relaxed text-foreground overflow-x-auto">
                      {asset.content}
                    </pre>
                  </section>
                )}

                {!asset.description && !asset.content && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      אין תוכן עדיין.{' '}
                      <Link href={`/assets/${asset.id}/edit`} className="text-primary hover:underline">
                        הוסף תיאור ותוכן
                      </Link>
                    </p>
                  </div>
                )}

                {/* Linked projects */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      פרויקטים מקושרים ({linkedProjects.length})
                    </h2>
                    <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                      <LinkIcon className="me-1.5 h-3.5 w-3.5" />
                      קשר לפרויקט
                    </Button>
                  </div>

                  {linkedProjects.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">לא מקושר לפרויקטים.</p>
                  ) : (
                    <div className="rounded-lg border border-border bg-card">
                      {linkedProjects.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                          <Link href={`/projects/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                            {p.name}
                          </Link>
                          <button
                            onClick={() => handleUnlink(p.id)}
                            title="הסר קישור"
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
                  <MetaRow label="סוג">
                    <Select
                      value={asset.asset_type}
                      onValueChange={(v) => v && update(asset.id, { asset_type: v as AssetType })}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                        <TypeBadge type={asset.asset_type} />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  <MetaRow label="סטטוס">
                    <Select
                      value={asset.status}
                      onValueChange={(v) => v && update(asset.id, { status: v as AssetStatus })}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                        <span className="text-sm">{STATUS_OPTIONS.find((o) => o.value === asset.status)?.label}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </MetaRow>

                  <MetaRow label="נוצר">
                    <span className="text-sm text-foreground">{format(new Date(asset.created_at), 'd/M/yyyy')}</span>
                  </MetaRow>
                  <MetaRow label="עודכן">
                    <span className="text-sm text-foreground">{format(new Date(asset.updated_at), 'd/M/yyyy')}</span>
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
            <DialogTitle>מחק נכס?</DialogTitle>
            <DialogDescription>
              <strong>{asset.name}</strong> יימחק לצמיתות.
            </DialogDescription>
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

      {/* Link project dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>קשר לפרויקט</DialogTitle>
          </DialogHeader>
          <Select value={selectedProj} onValueChange={(v) => v && setSelectedProj(v)}>
            <SelectTrigger>
              <SelectValue placeholder="בחר פרויקט..." />
            </SelectTrigger>
            <SelectContent>
              {unlinkable.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>ביטול</Button>
            <Button onClick={handleLink} disabled={!selectedProj}>קשר</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
