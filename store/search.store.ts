'use client'

import { create } from 'zustand'
import Fuse from 'fuse.js'
import type { Project, Task, AIAsset, Decision, KnowledgeItem } from '@/types/entities'

export type SearchResultType = 'project' | 'task' | 'asset' | 'decision' | 'knowledge'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle?: string
  href: string
  score: number
}

interface SearchState {
  query: string
  results: SearchResult[]
  isOpen: boolean

  projectsIndex: Fuse<Project> | null
  tasksIndex:    Fuse<Task> | null
  assetsIndex:   Fuse<AIAsset> | null
  decisionsIndex:Fuse<Decision> | null
  knowledgeIndex:Fuse<KnowledgeItem> | null

  setQuery:   (q: string) => void
  openPalette:  () => void
  closePalette: () => void

  rebuildProjects: (data: Project[])       => void
  rebuildTasks:    (data: Task[])          => void
  rebuildAssets:   (data: AIAsset[])       => void
  rebuildDecisions:(data: Decision[])      => void
  rebuildKnowledge:(data: KnowledgeItem[]) => void
}

const FUSE_OPTS = { threshold: 0.35, minMatchCharLength: 2, includeScore: true }

export const useSearchStore = create<SearchState>((set, get) => ({
  query:          '',
  results:        [],
  isOpen:         false,
  projectsIndex:  null,
  tasksIndex:     null,
  assetsIndex:    null,
  decisionsIndex: null,
  knowledgeIndex: null,

  openPalette:  () => set({ isOpen: true }),
  closePalette: () => set({ isOpen: false, query: '', results: [] }),

  setQuery: (q) => {
    const { projectsIndex, tasksIndex, assetsIndex, decisionsIndex, knowledgeIndex } = get()
    if (!q.trim()) {
      set({ query: q, results: [] })
      return
    }

    const results: SearchResult[] = []

    projectsIndex?.search(q).slice(0, 4).forEach(({ item, score }) => {
      results.push({
        type: 'project', id: item.id,
        title: item.name,
        subtitle: item.next_action || item.description || undefined,
        href: `/projects/${item.id}`,
        score: score ?? 1,
      })
    })

    tasksIndex?.search(q).slice(0, 3).forEach(({ item, score }) => {
      results.push({
        type: 'task', id: item.id,
        title: item.title,
        subtitle: item.notes || undefined,
        href: '/tasks',
        score: score ?? 1,
      })
    })

    assetsIndex?.search(q).slice(0, 3).forEach(({ item, score }) => {
      results.push({
        type: 'asset', id: item.id,
        title: item.name,
        subtitle: item.description || undefined,
        href: `/assets/${item.id}`,
        score: score ?? 1,
      })
    })

    decisionsIndex?.search(q).slice(0, 3).forEach(({ item, score }) => {
      results.push({
        type: 'decision', id: item.id,
        title: item.title,
        subtitle: item.decision_made || undefined,
        href: `/decisions/${item.id}`,
        score: score ?? 1,
      })
    })

    knowledgeIndex?.search(q).slice(0, 3).forEach(({ item, score }) => {
      results.push({
        type: 'knowledge', id: item.id,
        title: item.title,
        subtitle: item.body ? item.body.slice(0, 80) : undefined,
        href: `/knowledge/${item.id}`,
        score: score ?? 1,
      })
    })

    results.sort((a, b) => a.score - b.score)
    set({ query: q, results })
  },

  rebuildProjects: (data) => set({
    projectsIndex: new Fuse(data, {
      ...FUSE_OPTS,
      keys: [
        { name: 'name',        weight: 1.0 },
        { name: 'description', weight: 0.5 },
        { name: 'next_action', weight: 0.4 },
        { name: 'goal',        weight: 0.4 },
      ],
    }),
  }),

  rebuildTasks: (data) => set({
    tasksIndex: new Fuse(data, {
      ...FUSE_OPTS,
      keys: [
        { name: 'title', weight: 1.0 },
        { name: 'notes', weight: 0.5 },
      ],
    }),
  }),

  rebuildAssets: (data) => set({
    assetsIndex: new Fuse(data, {
      ...FUSE_OPTS,
      keys: [
        { name: 'name',        weight: 1.0 },
        { name: 'description', weight: 0.6 },
        { name: 'content',     weight: 0.3 },
      ],
    }),
  }),

  rebuildDecisions: (data) => set({
    decisionsIndex: new Fuse(data, {
      ...FUSE_OPTS,
      keys: [
        { name: 'title',         weight: 1.0 },
        { name: 'decision_made', weight: 0.7 },
        { name: 'rationale',     weight: 0.5 },
        { name: 'context',       weight: 0.4 },
      ],
    }),
  }),

  rebuildKnowledge: (data) => set({
    knowledgeIndex: new Fuse(data, {
      ...FUSE_OPTS,
      keys: [
        { name: 'title', weight: 1.0 },
        { name: 'body',  weight: 0.6 },
      ],
    }),
  }),
}))
