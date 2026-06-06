'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDecisionsStore } from '@/store/decisions.store'
import { TopBar } from '@/components/layout/TopBar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { DecisionStatus } from '@/types/entities'

const STATUS_OPTIONS: { value: DecisionStatus; label: string }[] = [
  { value: 'active',     label: 'פעיל' },
  { value: 'superseded', label: 'הוחלף' },
  { value: 'reversed',   label: 'בוטל' },
]

const STATUS_COLORS: Record<DecisionStatus, string> = {
  active:     'text-emerald-600 dark:text-emerald-400',
  superseded: 'text-amber-600 dark:text-amber-400',
  reversed:   'text-red-600 dark:text-red-400',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border py-3 last:border-0">
      <span className="w-24 shrink-0 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function DecisionDetailPage({ decisionId }: { decisionId: string }) {
  const router = useRouter()
  const { decisions, isLoading, load, update, remove } = useDecisionsStore()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => { if (decisions.length === 0) load() }, [decisions.length, load])

  const decision = decisions.find((d) => d.id === decisionId)

  async function handleDelete() {
    if (!decision) return
    setDeleting(true)
    try {
      await remove(decision.id)
      router.push('/decisions')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (isLoading && decisions.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">טוען...</div>
  }

  if (!decision) {
    return (
      <div className="flex flex-col overflow-hidden">
        <TopBar title="החלטה לא נמצאה" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-muted-foreground">החלטה זו אינה קיימת.</p>
          <Link href="/decisions" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> חזרה
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar
          title={
            <span className="flex items-center gap-1.5 text-sm">
              <Link href="/decisions" className="font-normal text-muted-foreground hover:text-foreground transition-colors">
                החלטות
              </Link>
              <span className="text-muted-foreground/50 select-none">/</span>
              <span className="font-semibold text-foreground">{decision.title}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/decisions/${decision.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>ערוך</Link>
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
              <Link href="/decisions" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> החלטות
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {decision.context && (
                  <Section title="הקשר">
                    <p className="whitespace-pre-wrap">{decision.context}</p>
                  </Section>
                )}
                {decision.options_considered && (
                  <Section title="אפשרויות שנשקלו">
                    <p className="whitespace-pre-wrap">{decision.options_considered}</p>
                  </Section>
                )}
                {decision.decision_made && (
                  <Section title="ההחלטה שהתקבלה">
                    <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
                      <p className="font-medium">{decision.decision_made}</p>
                    </div>
                  </Section>
                )}
                {decision.rationale && (
                  <Section title="נימוק">
                    <p className="whitespace-pre-wrap">{decision.rationale}</p>
                  </Section>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="rounded-lg border border-border bg-card p-4">
                  <MetaRow label="סטטוס">
                    <Select
                      value={decision.status}
                      onValueChange={(v) => v && update(decision.id, { status: v as DecisionStatus })}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&_svg]:ms-1">
                        <span className={cn('text-sm font-medium', STATUS_COLORS[decision.status])}>
                          {STATUS_OPTIONS.find((o) => o.value === decision.status)?.label}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </MetaRow>
                  <MetaRow label="נוצר">
                    <span className="text-sm">{format(new Date(decision.created_at), 'd/M/yyyy')}</span>
                  </MetaRow>
                  <MetaRow label="עודכן">
                    <span className="text-sm">{format(new Date(decision.updated_at), 'd/M/yyyy')}</span>
                  </MetaRow>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>מחק החלטה?</DialogTitle></DialogHeader>
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
