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
import type { KnowledgeItem, KnowledgeType } from '@/types/entities'

const TYPE_OPTIONS: { value: KnowledgeType; label: string }[] = [
  { value: 'note',      label: 'Note' },
  { value: 'reference', label: 'Reference' },
  { value: 'learning',  label: 'Learning' },
  { value: 'process',   label: 'Process' },
  { value: 'research',  label: 'Research' },
]

interface KnowledgeFormProps {
  mode: 'create' | 'edit'
  item?: KnowledgeItem
  defaultProjectId?: string
}

export function KnowledgeForm({ mode, item, defaultProjectId }: KnowledgeFormProps) {
  const router = useRouter()
  const { create, update } = useKnowledgeStore()
  const { projects } = useProjectsStore()

  const [title,         setTitle]         = useState(item?.title ?? '')
  const [body,          setBody]          = useState(item?.body ?? '')
  const [sourceUrl,     setSourceUrl]     = useState(item?.source_url ?? '')
  const [itemType,      setItemType]      = useState<KnowledgeType>(item?.item_type ?? 'note')
  const [linkedProject, setLinkedProject] = useState(item?.project_id ?? defaultProjectId ?? '')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!item
  const backUrl = isEdit ? `/knowledge/${item.id}` : '/knowledge'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        title:      title.trim(),
        body,
        source_url: sourceUrl,
        item_type:  itemType,
        project_id: linkedProject || null,
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
        title={isEdit ? 'Edit Knowledge Item' : 'New Knowledge Item'}
        actions={
          <Link href={backUrl} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-1.5">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. RLS policy patterns for Supabase" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={itemType} onValueChange={(v) => v && setItemType(v as KnowledgeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Project (optional)</Label>
                <Select value={linkedProject} onValueChange={(v) => setLinkedProject(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Notes, content, or details..." rows={10} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source_url">Source URL (optional)</Label>
              <Input id="source_url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..." type="url" />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Save Item'}
              </Button>
              <Link href={backUrl} className={buttonVariants({ variant: 'ghost' })}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
