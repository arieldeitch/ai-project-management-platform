'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useKnowledgeStore } from '@/store/knowledge.store'
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
import type { KnowledgeItem, KnowledgeType, DocRole, DocStatus } from '@/types/entities'

const TYPE_OPTIONS: { value: KnowledgeType; label: string }[] = [
  { value: 'note',      label: 'הערה' },
  { value: 'reference', label: 'הפניה' },
  { value: 'learning',  label: 'למידה' },
  { value: 'process',   label: 'תהליך' },
  { value: 'research',  label: 'מחקר' },
]

const DOC_ROLE_OPTIONS: { value: DocRole; label: string }[] = [
  { value: 'gpt_specification',        label: 'מפרט GPT' },
  { value: 'handoff_document',         label: 'מסמך מסירה' },
  { value: 'implementation_blueprint', label: 'תכנית מימוש' },
  { value: 'ux_notes',                 label: 'הערות UX' },
  { value: 'decisions_log',            label: 'יומן החלטות' },
  { value: 'execution_board',          label: 'לוח ביצוע' },
  { value: 'release_notes',            label: 'הערות גרסה' },
  { value: 'deployment_report',        label: 'דו"ח פריסה' },
  { value: 'recovery_report',          label: 'דו"ח שחזור' },
]

const DOC_STATUS_OPTIONS: { value: DocStatus; label: string }[] = [
  { value: 'draft',    label: 'טיוטה' },
  { value: 'current',  label: 'עדכני' },
  { value: 'outdated', label: 'ישן' },
]

interface KnowledgeFormProps {
  mode: 'create' | 'edit'
  item?: KnowledgeItem
  defaultProjectId?: string
  defaultDocRole?: DocRole
}

export function KnowledgeForm({ mode, item, defaultProjectId, defaultDocRole }: KnowledgeFormProps) {
  const router = useRouter()
  const { create, update } = useKnowledgeStore()
  const { projects } = useProjectsStore()

  const [title,         setTitle]         = useState(item?.title ?? '')
  const [body,          setBody]          = useState(item?.body ?? '')
  const [sourceUrl,     setSourceUrl]     = useState(item?.source_url ?? '')
  const [itemType,      setItemType]      = useState<KnowledgeType>(item?.item_type ?? 'note')
  const [linkedProject, setLinkedProject] = useState(item?.project_id ?? defaultProjectId ?? '')
  const [docRole,       setDocRole]       = useState<DocRole | ''>(item?.doc_role ?? defaultDocRole ?? '')
  const [docStatus,     setDocStatus]     = useState<DocStatus | ''>(item?.doc_status ?? '')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!item
  const backUrl = isEdit ? `/knowledge/${item.id}` : '/knowledge'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('כותרת נדרשת.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        title:      title.trim(),
        body,
        source_url: sourceUrl,
        item_type:  itemType,
        project_id: linkedProject || null,
        doc_role:   docRole || undefined,
        doc_status: docRole && docStatus ? docStatus : undefined,
      }
      if (isEdit) {
        await update(item.id, payload)
        router.push(`/knowledge/${item.id}`)
      } else {
        const k = await create(payload)
        router.push(`/knowledge/${k.id}`)
      }
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title={isEdit ? 'ערוך פריט ידע' : 'פריט ידע חדש'}
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
              <Label htmlFor="title">כותרת <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוג' רשימת בדיקות לפריסה ב-Vercel" autoFocus />
            </div>

            {/* Type + Project */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>סוג</Label>
                <Select value={itemType} onValueChange={(v) => v && setItemType(v as KnowledgeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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

            {/* Doc Role + Doc Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>תפקיד מסמך</Label>
                <Select value={docRole} onValueChange={(v) => setDocRole((v as DocRole) ?? '')}>
                  <SelectTrigger><SelectValue placeholder="ללא תפקיד" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ללא תפקיד</SelectItem>
                    {DOC_ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {docRole && (
                <div className="space-y-1.5">
                  <Label>סטטוס</Label>
                  <Select value={docStatus} onValueChange={(v) => setDocStatus((v as DocStatus) ?? '')}>
                    <SelectTrigger><SelectValue placeholder="ללא סטטוס" /></SelectTrigger>
                    <SelectContent>
                      {DOC_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">תוכן</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="הערות, תוכן או פרטים..." rows={10} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source_url">כתובת מקור (אופציונלי)</Label>
              <Input id="source_url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..." type="url" />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'שמור שינויים' : 'שמור פריט'}
              </Button>
              <Link href={backUrl} className={buttonVariants({ variant: 'ghost' })}>ביטול</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
