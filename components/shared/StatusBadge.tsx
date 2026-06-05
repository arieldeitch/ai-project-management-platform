import { STATUS_CONFIG } from '@/lib/constants/statuses'
import type { ProjectStatus } from '@/types/entities'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.color,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot, config.pulse && 'animate-pulse')} />
      {config.label}
    </span>
  )
}
