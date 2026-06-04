'use client'

import { create } from 'zustand'
import { ProjectsRepository } from '@/data/repositories/projects.repository'
import type { Project, ProjectCreateInput, ProjectUpdateInput } from '@/types/entities'

interface ProjectsState {
  projects: Project[]
  isLoading: boolean
  error: string | null

  load: () => Promise<void>
  create: (input: ProjectCreateInput) => Promise<Project>
  update: (id: string, input: ProjectUpdateInput) => Promise<Project>
  remove: (id: string) => Promise<void>
  getById: (id: string) => Project | undefined
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await ProjectsRepository.findAll()
      set({ projects, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  create: async (input) => {
    const project = await ProjectsRepository.create(input)
    set((s) => ({ projects: [project, ...s.projects] }))
    return project
  },

  update: async (id, input) => {
    const updated = await ProjectsRepository.update(id, input)
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }))
    return updated
  },

  remove: async (id) => {
    await ProjectsRepository.delete(id)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },

  getById: (id) => get().projects.find((p) => p.id === id),
}))
