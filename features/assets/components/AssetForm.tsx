'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAssetsStore } from '@/store/assets.store'
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
import type { AIAsset, AssetType, AssetStatus } from '@/types/entities'

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'prompt',       label: 'פרומפט' },
  { value: 'agent',        label: 'סוכן' },
  { value: 'gpt',          label: 'GPT' },
  { value: 'workflow',     label: 'תהליך' },
  { value: 'tool',         label: 'כלי' },
  { value: 'model_config', label: 'הגדרות מודל' },
]

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'idea',       label: 'רעיון' },
  { value: 'draft',      label: 'טיוטה' },
  { value: 'active',     label: 'פעיל' },
  { value: 'deprecated', label: 'לא בשימוש' },
]

interface AssetFormProps {
  mode: 'create' | 'edit'
  asset?: AIAsset
}

export function AssetForm({ mode, asset }: AssetFormProps) {
  const router = useRouter()
  const { create, update } = useAssetsStore()

  const [name,        setName]        = useState(asset?.name ?? '')
  const [description, setDescription] = useState(asset?.description ?? '')
  const [content,     setContent]     = useState(asset?.content ?? '')
  const [assetType,   setAssetType]   = useState<AssetType>(asset?.asset_type ?? 'prompt')
  const [status,      setStatus]      = useState<AssetStatus>(asset?.status ?? 'idea')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!asset
  const backUrl = isEdit ? `/assets/${asset.id}` : '/assets'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('שם הנכס נדרש.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload = { name: name.trim(), description, content, asset_type: assetType, status }
      if (isEdit) {
        await update(asset.id, payload)
        router.push(`/assets/${asset.id}`)
      } else {
        const a = await create(payload)
        router.push(`/assets/${a.id}`)
      }
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title={isEdit ? 'ערוך נכס' : 'נכס AI חדש'}
        actions={
          <Link href={backUrl} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
            חזרה
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-1.5">
              <Label htmlFor="name">שם <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוג' פרומפט סיכום פרויקט"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>סוג</Label>
                <Select value={assetType} onValueChange={(v) => v && setAssetType(v as AssetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>סטטוס</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v as AssetStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="מה הנכס הזה עושה ומתי משתמשים בו..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">תוכן / הגדרות</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="טקסט הפרומפט, הגדרות הסוכן, או הגדרת התהליך..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'שמור שינויים' : 'צור נכס'}
              </Button>
              <Link href={backUrl} className={buttonVariants({ variant: 'ghost' })}>ביטול</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
