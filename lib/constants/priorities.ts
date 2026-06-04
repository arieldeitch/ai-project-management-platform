import type { ProjectPriority } from '@/types/entities'

export const PRIORITY_CONFIG: Record<
  ProjectPriority,
  { label: string; color: string }
> = {
  critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400' },
  high:     { label: 'High',     color: 'text-orange-600 dark:text-orange-400' },
  medium:   { label: 'Medium',   color: 'text-blue-600 dark:text-blue-400' },
  low:      { label: 'Low',      color: 'text-zinc-500 dark:text-zinc-400' },
  unset:    { label: '—',        color: 'text-zinc-400 dark:text-zinc-600' },
}
