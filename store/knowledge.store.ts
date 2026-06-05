'use client'

import { create } from 'zustand'
import { KnowledgeRepository } from '@/data/repositories/knowledge.repository'
import type { KnowledgeItem, KnowledgeCreateInput, KnowledgeUpdateInput } from '@/types/entities'

interface KnowledgeState {
  items: KnowledgeItem[]
  isLoading: boolean
  error: string | null

  load: () => Promise<void>
  loadByProject: (projectId: string) => Promise<void>
  create: (input: KnowledgeCreateInput) => Promise<KnowledgeItem>
  update: (id: string, input: KnowledgeUpdateInput) => Promise<KnowledgeItem>
  remove: (id: string) => Promise<void>
  getById: (id: string) => KnowledgeItem | undefined
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const items = await KnowledgeRepository.findAll()
      set({ items, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  loadByProject: async (projectId) => {
    try {
      const projectItems = await KnowledgeRepository.findByProject(projectId)
      set((s) => {
        const others = s.items.filter((i) => i.project_id !== projectId)
        return { items: [...others, ...projectItems] }
      })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  create: async (input) => {
    const item = await KnowledgeRepository.create(input)
    set((s) => ({ items: [item, ...s.items] }))
    return item
  },

  update: async (id, input) => {
    const updated = await KnowledgeRepository.update(id, input)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }))
    return updated
  },

  remove: async (id) => {
    await KnowledgeRepository.delete(id)
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  getById: (id) => get().items.find((i) => i.id === id),
}))
