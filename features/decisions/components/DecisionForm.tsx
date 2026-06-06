'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDecisionsStore } from '@/store/decisions.store'
import { useProjectsStore } from '@/store/projects.store'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Decision, DecisionStatus } from '@/types/entities'

const STATUS_OPTIONS: { value: DecisionStatus; label: string }[] = [
  { value: 'active',     label: 'פעיל' },
  { value: 'superseded', label: 'הוחלף' },
  { value: 'reversed',   label: 'בוטל' },
]

interface DecisionFormProps {
  mode: 'create' | 'edit'
  decision?: Decision
  defaultProjectId?: string
}

export function DecisionForm({ mode, decision, defaultProjectId }: DecisionFormProps) {
  const router   = useRouter()
  const { create, update } = useDecisionsStore()
  const { projects } = useProjectsStore()

  const [title,           setTitle]           = useState(decision?.title ?? '')
  const [context,         setContext]         = useState(decision?.context ?? '')
  const [options,         setOptions]         = useState(decision?.options_considered ?? '')
  const [decisionMade,    setDecisionMade]    = useState(decision?.decision_made ?? '')
  const [rationale,       setRationale]       = useState(decision?.rationale ?? '')
  const [status,          setStatus]          = useState<DecisionStatus>(decision?.status ?? 'active')
  const [linkedProject,   setLinkedProject]   = useState(decision?.project_id ?? defaultProjectId ?? '')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!decision
  const backUrl = isEdit ? `/decisions/${decision.id}` : '/decisions'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('כותרת נדרשת.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        title:              title.trim(),
        context,
        options_considered: options,
        decision_made:      decisionMade,
        rationale,
        status,
        project_id:         linkedProject || null,
        decided_at:         decision?.decided_at ?? new Date().toISOString(),
      }
      if (isEdit) {
        await update(decision.id, payload)
        router.push(`/decisions/${decision.id}`)
      } else {
        const d = await create(payload)
        router.push(`/decisions/${d.id}`)
      }
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title={isEdit ? 'ערוך החלטה' : 'החלטה חדשה'}
        actions={
          <Link href={backUrl} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" /> חזרה
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-1.5">
              <Label htmlFor="title">כותרת ההחלטה <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוג' השתמש ב-Dexie במקום SQLite WASM" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>סטטוס</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v as DecisionStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>פרויקט (אופציונלי)</Label>
                <Select value={linkedProject} onValueChange={(v) => setLinkedProject(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="ללא פרויקט" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ללא פרויקט</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="context">הקשר</Label>
              <Textarea id="context" value={context} onChange={(e) => setContext(e.target.value)}
                placeholder="איזו מצב הוביל להחלטה זו?" rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="options">אפשרויות שנשקלו</Label>
              <Textarea id="options" value={options} onChange={(e) => setOptions(e.target.value)}
                placeholder="אילו חלופות הוערכו?" rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="decision">ההחלטה שהתקבלה</Label>
              <Input id="decision" value={decisionMade} onChange={(e) => setDecisionMade(e.target.value)}
                placeholder="האפשרות שנבחרה במשפט אחד" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rationale">נימוק</Label>
              <Textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)}
                placeholder="למה נבחרה אפשרות זו..." rows={3} />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'שמור שינויים' : 'רשום החלטה'}
              </Button>
              <Link href={backUrl} className={buttonVariants({ variant: 'ghost' })}>ביטול</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
