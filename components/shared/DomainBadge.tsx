import { DOMAIN_CONFIG } from '@/lib/constants/domains'
import type { ProjectDomain } from '@/types/entities'
import { cn } from '@/lib/utils'

interface DomainBadgeProps {
  domain: ProjectDomain
  className?: string
}

export function DomainBadge({ domain, className }: DomainBadgeProps) {
  const config = DOMAIN_CONFIG[domain]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}
