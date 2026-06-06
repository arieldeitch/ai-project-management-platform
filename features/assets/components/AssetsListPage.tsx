'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAssetsStore } from '@/store/assets.store'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'
import { Bot, Plus, ChevronLeft, Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { AIAsset, AssetType, AssetStatus } from '@/types/entities'

/* ── config ────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<AssetType, { label: string; color: string }> = {
  prompt:       { label: 'פרומפט',        color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  agent:        { label: 'סוכן',          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  gpt:          { label: 'GPT',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  workflow:     { label: 'תהליך',         color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  tool:         { label: 'כלי',           color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400' },
  model_config: { label: 'הגדרות מודל',  color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
}

const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string }> = {
  idea:       { label: 'רעיון',       color: 'text-zinc-500' },
  draft:      { label: 'טיוטה',       color: 'text-amber-600 dark:text-amber-400' },
  active:     { label: 'פעיל',        color: 'text-emerald-600 dark:text-emerald-400' },
  deprecated: { label: 'לא בשימוש',  color: 'text-zinc-400 line-through' },
}

type TypeFilter = 'all' | AssetType

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: 'all',          label: 'הכל' },
  { value: 'prompt',       label: 'פרומפטים' },
  { value: 'agent',        label: 'סוכנים' },
  { value: 'gpt',          label: 'GPTs' },
  { value: 'workflow',     label: 'תהליכים' },
  { value: 'tool',         label: 'כלים' },
  { value: 'model_config', label: 'הגדרות' },
]

/* ── components ────────────────────────────────────────────── */

function TypeBadge({ type }: { type: AssetType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.label}
    </span>
  )
}

function StatusDot({ status }: { status: AssetStatus }) {
  const cfg = STATUS_CONFIG[status]
  return <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
}

function AssetRow({ asset, onDuplicate, onDelete }: {
  asset: AIAsset
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const updatedAt = formatDistanceToNow(new Date(asset.updated_at), { addSuffix: true })

  return (
    <div className="group flex items-center gap-4 border-b border-border px-6 py-3.5 last:border-0 hover:bg-muted/40 transition-colors">
      <Link href={`/assets/${asset.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground group-hover:text-primary truncate">
              {asset.name}
            </span>
          </div>
          {asset.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{asset.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <TypeBadge type={asset.asset_type} />
          <StatusDot status={asset.status} />
          <span className="hidden text-xs text-muted-foreground sm:block w-24 text-end">{updatedAt}</span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      {/* Row actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDuplicate(asset.id)}
          title="שכפל"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(asset.id)}
          title="מחק"
          className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ── main page ─────────────────────────────────────────────── */

export function AssetsListPage() {
  const { assets, isLoading, load, duplicate, remove } = useAssetsStore()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => { load() }, [load])

  const filtered =
    typeFilter === 'all' ? assets : assets.filter((a) => a.asset_type === typeFilter)

  function typeCount(t: TypeFilter) {
    return t === 'all' ? assets.length : assets.filter((a) => a.asset_type === t).length
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title="נכסי AI"
        actions={
          <Link href="/assets/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            נכס חדש
          </Link>
        }
      />

      {/* Type tabs */}
      <div className="flex items-stretch border-b border-border bg-background px-6 overflow-x-auto">
        {TYPE_TABS.map((tab) => {
          const count = typeCount(tab.value)
          if (tab.value !== 'all' && count === 0) return null
          const isActive = typeFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {tab.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">טוען...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bot className="h-12 w-12" />}
            title="אין נכסי AI עדיין"
            description={typeFilter === 'all' ? 'צור את הפרומפט, הסוכן או ה-GPT הראשון שלך.' : `אין נכסים מסוג "${TYPE_CONFIG[typeFilter as AssetType]?.label ?? typeFilter}".`}
            action={
              typeFilter === 'all' ? (
                <Link href="/assets/new" className={cn(buttonVariants({ size: 'sm' }))}>
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  נכס חדש
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div>
            {filtered.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
