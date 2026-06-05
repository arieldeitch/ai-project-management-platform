'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchStore } from '@/store/search.store'
import { useProjectsStore } from '@/store/projects.store'
import { useTasksStore } from '@/store/tasks.store'
import { useAssetsStore } from '@/store/assets.store'
import { useDecisionsStore } from '@/store/decisions.store'
import { useKnowledgeStore } from '@/store/knowledge.store'
import { Search, FolderKanban, CheckSquare, Bot, BookOpen, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResultType } from '@/store/search.store'

const TYPE_CONFIG: Record<SearchResultType, { label: string; icon: React.ElementType; color: string }> = {
  project:   { label: 'Project',   icon: FolderKanban, color: 'text-blue-500' },
  task:      { label: 'Task',      icon: CheckSquare,  color: 'text-emerald-500' },
  asset:     { label: 'Asset',     icon: Bot,          color: 'text-violet-500' },
  decision:  { label: 'Decision',  icon: BookOpen,     color: 'text-amber-500' },
  knowledge: { label: 'Knowledge', icon: FileText,     color: 'text-zinc-500' },
}

export function CommandPalette() {
  const router = useRouter()
  const { query, results, isOpen, setQuery, closePalette,
          rebuildProjects, rebuildTasks, rebuildAssets, rebuildDecisions, rebuildKnowledge } = useSearchStore()
  const { projects } = useProjectsStore()
  const { tasks }    = useTasksStore()
  const { assets }   = useAssetsStore()
  const { decisions } = useDecisionsStore()
  const { items: knowledge } = useKnowledgeStore()
  const inputRef = useRef<HTMLInputElement>(null)

  /* Rebuild indexes when data changes */
  useEffect(() => { rebuildProjects(projects)    }, [projects,   rebuildProjects])
  useEffect(() => { rebuildTasks(tasks)           }, [tasks,      rebuildTasks])
  useEffect(() => { rebuildAssets(assets)         }, [assets,     rebuildAssets])
  useEffect(() => { rebuildDecisions(decisions)   }, [decisions,  rebuildDecisions])
  useEffect(() => { rebuildKnowledge(knowledge)   }, [knowledge,  rebuildKnowledge])

  /* Focus input when palette opens */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  /* Global ⌘K / Ctrl+K shortcut */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) closePalette()
        else useSearchStore.getState().openPalette()
      }
      if (e.key === 'Escape' && isOpen) {
        closePalette()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, closePalette])

  function navigate(href: string) {
    closePalette()
    router.push(href)
  }

  if (!isOpen) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={closePalette}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, assets, decisions, knowledge..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {query && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!query && (
            <div className="space-y-1 px-2 py-2">
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Quick navigation
              </p>
              {[
                { label: 'Projects',  href: '/projects',  icon: FolderKanban },
                { label: 'Tasks',     href: '/tasks',     icon: CheckSquare },
                { label: 'AI Assets', href: '/assets',    icon: Bot },
                { label: 'Decisions', href: '/decisions', icon: BookOpen },
                { label: 'Knowledge', href: '/knowledge', icon: FileText },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1 px-2">
              {results.map((result) => {
                const cfg = TYPE_CONFIG[result.type]
                const Icon = cfg.icon
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => navigate(result.href)}
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', cfg.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
