import type { ProjectPriority } from '@/types/entities'

export const PRIORITY_CONFIG: Record<
  ProjectPriority,
  { label: string; color: string; bg: string; dot: string }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg:    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
    dot:   'bg-red-500',
  },
  high: {
    label: 'High',
    color: 'text-orange-600 dark:text-orange-400',
    bg:    'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400',
    dot:   'bg-orange-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
    dot:   'bg-indigo-400',
  },
  low: {
    label: 'Low',
    color: 'text-zinc-500 dark:text-zinc-400',
    bg:    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    dot:   'bg-zinc-300 dark:bg-zinc-600',
  },
  unset: {
    label: '—',
    color: 'text-zinc-400 dark:text-zinc-600',
    bg:    '',
    dot:   '',
  },
}
