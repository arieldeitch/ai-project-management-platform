import { ProjectDetailPage } from '@/features/projects/components/ProjectDetailPage'

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProjectDetailPage projectId={id} />
}
