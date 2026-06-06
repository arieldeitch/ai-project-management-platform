import type { ProjectDomain } from '@/types/entities'

export const DOMAIN_CONFIG: Record<ProjectDomain, { label: string; color: string }> = {
  personal: { label: 'אישי',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  work:     { label: 'עבודה', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  general:  { label: 'כללי',  color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
}
