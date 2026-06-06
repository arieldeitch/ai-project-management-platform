'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useKnowledgeStore } from '@/store/knowledge.store'
import { TopBar } from '@/components/layout/TopBar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, MoreHorizontal, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { KnowledgeType, DocRole, DocStatus } from '@/types/entities'

const TYPE_CONFIG: Record<KnowledgeType, { label: string; color: string }> = {
  note:      { label: 'הערה',   color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  reference: { label: 'הפניה',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  learning:  { label: 'למידה',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  process:   { label: 'תהליך',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  research:  { label: 'מחקר',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
}

const DOC_ROLE_LABELS: Record<DocRole, string> = {
  gpt_specification:        'מפרט GPT',
  handoff_document:         'מסמך מסירה',
  implementation_blueprint: 'תכנית מימוש',
  ux_notes:                 'הערות UX',
  decisions_log:            'יומן החלטות',
  execution_board:          'לוח ביצוע',
  release_notes:            'הערות גרסה',
  deployment_report:        'דו"ח פריסה',
  recovery_report:          'דו"ח שחזור',
}

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  current:  'עדכני',
  draft:    'טיוטה',
  outdated: 'ישן',
}

const DOC_STATUS_STYLE: Record<DocStatus, string> = {
  current:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  draft:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  outdated: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-3 last:border-0">
      <span className="w-24 shrink-0 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function KnowledgeDetailPage({ itemId }: { itemId: string }) {
  const router = useRouter()
  const { items, isLoading, load, remove } = useKnowledgeStore()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => { if (items.length === 0) load() }, [items.length, load])

  const item = items.find((i) => i.id === itemId)

  async function handleDelete() {
    if (!item) return
    setDeleting(true)
    try {
      await remove(item.id)
      router.push('/knowledge')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (isLoading && items.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">טוען...</div>
  }

  if (!item) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="פריט לא נמצא" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">פריט הידע הזה אינו קיים.</p>
          <Link href="/knowledge" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> חזרה לידע
          </Link>
        </div>
      </div>
    )
  }

  const cfg = TYPE_CONFIG[item.item_type]

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={
            <span className="flex items-center gap-1.5 text-sm">
              <Link href="/knowledge" className="font-normal text-muted-foreground hover:text-foreground transition-colors">
                ידע
              </Link>
              <span className="text-muted-foreground/50 select-none">/</span>
              <span className="font-semibold text-foreground">{item.title}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/knowledge/${item.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>ערוך</Link>
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="me-2 h-4 w-4" /> מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/knowledge" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> ידע
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {item.body ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">
                    {item.body}
                  </pre>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      אין תוכן עדיין.{' '}
                      <Link href={`/knowledge/${item.id}/edit`} className="text-primary hover:underline">
                        הוסף תוכן
                      </Link>
                    </p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4">
                  <MetaRow label="סוג">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
                      {cfg.label}
                    </span>
                  </MetaRow>

                  {item.doc_role && (
                    <MetaRow label="תפקיד">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {DOC_ROLE_LABELS[item.doc_role]}
                      </span>
                    </MetaRow>
                  )}

                  {item.doc_status && (
                    <MetaRow label="סטטוס">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        DOC_STATUS_STYLE[item.doc_status],
                      )}>
                        {DOC_STATUS_LABEL[item.doc_status]}
                      </span>
                    </MetaRow>
                  )}

                  {item.source_url && (
                    <MetaRow label="מקור">
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        פתח מקור <ExternalLink className="h-3 w-3" />
                      </a>
                    </MetaRow>
                  )}
                  <MetaRow label="נוצר">
                    <span className="text-sm">{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                  </MetaRow>
                  <MetaRow label="עודכן">
                    <span className="text-sm">{format(new Date(item.updated_at), 'MMM d, yyyy')}</span>
                  </MetaRow>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>מחק פריט ידע?</DialogTitle></DialogHeader>
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
