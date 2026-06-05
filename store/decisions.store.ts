'use client'

import { create } from 'zustand'
import { DecisionsRepository } from '@/data/repositories/decisions.repository'
import type { Decision, DecisionCreateInput, DecisionUpdateInput } from '@/types/entities'

interface DecisionsState {
  decisions: Decision[]
  isLoading: boolean
  error: string | null

  load: () => Promise<void>
  loadByProject: (projectId: string) => Promise<void>
  create: (input: DecisionCreateInput) => Promise<Decision>
  update: (id: string, input: DecisionUpdateInput) => Promise<Decision>
  remove: (id: string) => Promise<void>
  getById: (id: string) => Decision | undefined
}

export const useDecisionsStore = create<DecisionsState>((set, get) => ({
  decisions: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const decisions = await DecisionsRepository.findAll()
      set({ decisions, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  loadByProject: async (projectId) => {
    try {
      const projectDecisions = await DecisionsRepository.findByProject(projectId)
      set((s) => {
        const others = s.decisions.filter((d) => d.project_id !== projectId)
        return { decisions: [...others, ...projectDecisions] }
      })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  create: async (input) => {
    const decision = await DecisionsRepository.create(input)
    set((s) => ({ decisions: [decision, ...s.decisions] }))
    return decision
  },

  update: async (id, input) => {
    const updated = await DecisionsRepository.update(id, input)
    set((s) => ({ decisions: s.decisions.map((d) => (d.id === id ? updated : d)) }))
    return updated
  },

  remove: async (id) => {
    await DecisionsRepository.delete(id)
    set((s) => ({ decisions: s.decisions.filter((d) => d.id !== id) }))
  },

  getById: (id) => get().decisions.find((d) => d.id === id),
}))
