import { PRIORITY_CONFIG } from '@/lib/constants/priorities'
import type { ProjectPriority } from '@/types/entities'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: ProjectPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  if (!config.bg) {
    return (
      <span className={cn('text-xs font-medium', config.color, className)}>
        {config.label}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
