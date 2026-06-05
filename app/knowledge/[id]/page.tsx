import { KnowledgeDetailPage } from '@/features/knowledge/components/KnowledgeDetailPage'

interface Props { params: Promise<{ id: string }> }

export default async function KnowledgeDetail({ params }: Props) {
  const { id } = await params
  return <KnowledgeDetailPage itemId={id} />
}
