'use client'

import { create } from 'zustand'
import { AssetsRepository } from '@/data/repositories/assets.repository'
import type { AIAsset, AssetCreateInput, AssetUpdateInput } from '@/types/entities'

interface AssetsState {
  assets: AIAsset[]
  isLoading: boolean
  error: string | null

  load: () => Promise<void>
  create: (input: AssetCreateInput) => Promise<AIAsset>
  update: (id: string, input: AssetUpdateInput) => Promise<AIAsset>
  remove: (id: string) => Promise<void>
  duplicate: (id: string) => Promise<AIAsset>
  linkToProject: (assetId: string, projectId: string) => Promise<void>
  unlinkFromProject: (assetId: string, projectId: string) => Promise<void>
  getById: (id: string) => AIAsset | undefined
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  assets: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const assets = await AssetsRepository.findAll()
      set({ assets, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  create: async (input) => {
    const asset = await AssetsRepository.create(input)
    set((s) => ({ assets: [asset, ...s.assets] }))
    return asset
  },

  update: async (id, input) => {
    const updated = await AssetsRepository.update(id, input)
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? updated : a)) }))
    return updated
  },

  remove: async (id) => {
    await AssetsRepository.delete(id)
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }))
  },

  duplicate: async (id) => {
    const copy = await AssetsRepository.duplicate(id)
    set((s) => ({ assets: [copy, ...s.assets] }))
    return copy
  },

  linkToProject: async (assetId, projectId) => {
    await AssetsRepository.linkToProject(assetId, projectId)
  },

  unlinkFromProject: async (assetId, projectId) => {
    await AssetsRepository.unlinkFromProject(assetId, projectId)
  },

  getById: (id) => get().assets.find((a) => a.id === id),
}))
