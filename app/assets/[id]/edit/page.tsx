'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAssetsStore } from '@/store/assets.store'
import { AssetForm } from '@/features/assets/components/AssetForm'

export default function EditAsset() {
  const params = useParams<{ id: string }>()
  const { assets, load } = useAssetsStore()

  useEffect(() => { if (assets.length === 0) load() }, [assets.length, load])

  const asset = assets.find((a) => a.id === params.id)
  if (!asset) return null

  return <AssetForm mode="edit" asset={asset} />
}
