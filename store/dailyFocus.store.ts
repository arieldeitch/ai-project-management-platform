'use client'

import { create } from 'zustand'
import { DailyFocusRepository } from '@/data/repositories/dailyFocus.repository'
import type { DailyFocus, DailyFocusCreateInput, DailyFocusUpdateInput } from '@/types/entities'

function todayDate() { return new Date().toISOString().split('T')[0] }

interface DailyFocusState {
  focuses: DailyFocus[]
  isLoading: boolean
  error: string | null

  loadToday: () => Promise<void>
  createFocus: (input: DailyFocusCreateInput) => Promise<DailyFocus>
  updateFocus: (id: string, input: DailyFocusUpdateInput) => Promise<DailyFocus>
  deleteFocus: (id: string) => Promise<void>
  markDone: (id: string) => Promise<DailyFocus>
  markDeferred: (id: string) => Promise<DailyFocus>
}

export const useDailyFocusStore = create<DailyFocusState>((set, get) => ({
  focuses: [],
  isLoading: false,
  error: null,

  loadToday: async () => {
    set({ isLoading: true, error: null })
    try {
      const focuses = await DailyFocusRepository.getByDate(todayDate())
      set({ focuses, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  createFocus: async (input) => {
    const item = await DailyFocusRepository.create(input)
    set((s) => ({ focuses: [item, ...s.focuses] }))
    return item
  },

  updateFocus: async (id, input) => {
    const updated = await DailyFocusRepository.update(id, input)
    set((s) => ({ focuses: s.focuses.map((f) => (f.id === id ? updated : f)) }))
    return updated
  },

  deleteFocus: async (id) => {
    await DailyFocusRepository.delete(id)
    set((s) => ({ focuses: s.focuses.filter((f) => f.id !== id) }))
  },

  markDone: async (id) => {
    const updated = await DailyFocusRepository.markDone(id)
    set((s) => ({ focuses: s.focuses.map((f) => (f.id === id ? updated : f)) }))
    return updated
  },

  markDeferred: async (id) => {
    const updated = await DailyFocusRepository.markDeferred(id)
    set((s) => ({ focuses: s.focuses.map((f) => (f.id === id ? updated : f)) }))
    return updated
  },
}))
