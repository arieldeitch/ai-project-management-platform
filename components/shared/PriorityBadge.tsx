import { PRIORITY_CONFIG } from '@/lib/constants/priorities'
import type { ProjectPriority } from '@/types/entities'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: ProjectPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <span className={cn('text-xs font-medium', config.color, className)}>
      {config.label}
    </span>
  )
}
