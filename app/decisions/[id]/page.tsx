import { DecisionDetailPage } from '@/features/decisions/components/DecisionDetailPage'

interface Props { params: Promise<{ id: string }> }

export default async function DecisionDetail({ params }: Props) {
  const { id } = await params
  return <DecisionDetailPage decisionId={id} />
}
