import { ProjectsListPage } from '@/features/projects/components/ProjectsListPage'
import type { ProjectStatus, ProjectDomain } from '@/types/entities'

interface Props {
  searchParams: Promise<{ status?: string; domain?: string }>
}

const VALID_STATUSES = new Set<ProjectStatus>([
  'idea', 'scoped', 'active', 'blocked', 'completed', 'deferred', 'archived',
])
const VALID_DOMAINS = new Set<ProjectDomain>(['personal', 'work', 'general'])

export default async function Projects({ searchParams }: Props) {
  const params = await searchParams
  const initialStatus = VALID_STATUSES.has(params.status as ProjectStatus)
    ? (params.status as ProjectStatus)
    : undefined
  const initialDomain = VALID_DOMAINS.has(params.domain as ProjectDomain)
    ? (params.domain as ProjectDomain)
    : undefined

  return <ProjectsListPage initialStatus={initialStatus} initialDomain={initialDomain} />
}
