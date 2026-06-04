import type { ProjectStatus } from '@/types/entities'

export const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; dot: string }
> = {
  idea:      { label: 'Idea',      color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',             dot: 'bg-zinc-400' },
  scoped:    { label: 'Scoped',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',           dot: 'bg-blue-500' },
  active:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
  blocked:   { label: 'Blocked',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',               dot: 'bg-red-500' },
  completed: { label: 'Completed', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',   dot: 'bg-violet-500' },
  deferred:  { label: 'Deferred',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',       dot: 'bg-amber-500' },
  archived:  { label: 'Archived',  color: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-500',           dot: 'bg-zinc-300' },
}

export const STATUS_ORDER: ProjectStatus[] = [
  'active', 'blocked', 'scoped', 'idea', 'completed', 'deferred', 'archived',
]
