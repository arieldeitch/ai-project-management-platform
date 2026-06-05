'use client'

import { useSearchStore } from '@/store/search.store'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: React.ReactNode
  actions?: React.ReactNode
}

export function TopBar({ title, actions }: TopBarProps) {
  const { openPalette } = useSearchStore()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="text-lg font-semibold text-foreground tracking-tight">{title}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={openPalette}
          className={cn(
            'flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground',
            'hover:bg-muted hover:text-foreground transition-colors'
          )}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-background border border-border px-1 py-0.5 text-[10px] sm:inline">⌘K</kbd>
        </button>
        {actions}
      </div>
    </header>
  )
}
