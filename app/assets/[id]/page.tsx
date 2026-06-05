import { AssetDetailPage } from '@/features/assets/components/AssetDetailPage'

interface Props { params: Promise<{ id: string }> }

export default async function AssetDetail({ params }: Props) {
  const { id } = await params
  return <AssetDetailPage assetId={id} />
}
