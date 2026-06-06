import type { ProjectStatus } from '@/types/entities'

export const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; dot: string; pulse?: boolean }
> = {
  draft:                { label: 'טיוטה',          color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',               dot: 'bg-zinc-400' },
  scoped:               { label: 'ממוסגר',          color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',                dot: 'bg-sky-500' },
  gpt_setup:            { label: 'הגדרת GPT',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',    dot: 'bg-purple-500' },
  ready_for_development:{ label: 'מוכן לפיתוח',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',            dot: 'bg-teal-500' },
  in_development:       { label: 'בפיתוח',          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',            dot: 'bg-blue-500' },
  testing:              { label: 'בבדיקה',           color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',    dot: 'bg-orange-500' },
  deployed:             { label: 'מוצב',             color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',            dot: 'bg-cyan-500' },
  active:               { label: 'פעיל',             color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
  blocked:              { label: 'חסום',             color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',                dot: 'bg-red-500', pulse: true },
  completed:            { label: 'הושלם',            color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',    dot: 'bg-violet-500' },
  deferred:             { label: 'נדחה',             color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',        dot: 'bg-amber-500' },
  archived:             { label: 'בארכיון',          color: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-500',            dot: 'bg-zinc-300' },
}

export const STATUS_ORDER: ProjectStatus[] = [
  'active', 'in_development', 'testing', 'blocked',
  'ready_for_development', 'gpt_setup', 'scoped', 'draft',
  'deployed', 'completed', 'deferred', 'archived',
]

export const LIFECYCLE_STAGES: ProjectStatus[] = [
  'draft', 'scoped', 'gpt_setup', 'ready_for_development',
  'in_development', 'testing', 'deployed', 'active',
]
