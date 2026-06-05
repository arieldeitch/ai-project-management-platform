'use client'

import { create } from 'zustand'
import { TasksRepository } from '@/data/repositories/tasks.repository'
import type { Task, TaskCreateInput, TaskUpdateInput } from '@/types/entities'

interface TasksState {
  tasks: Task[]
  isLoading: boolean
  error: string | null

  load: () => Promise<void>
  loadByProject: (projectId: string) => Promise<void>
  create: (input: TaskCreateInput) => Promise<Task>
  update: (id: string, input: TaskUpdateInput) => Promise<Task>
  remove: (id: string) => Promise<void>
  cycleStatus: (id: string) => Promise<Task>
}

const STATUS_CYCLE = {
  todo:        'in_progress',
  in_progress: 'done',
  done:        'todo',
  blocked:     'todo',
} as const

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await TasksRepository.findAll()
      set({ tasks, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  loadByProject: async (projectId) => {
    set({ isLoading: true })
    try {
      const tasks = await TasksRepository.findByProject(projectId)
      set((s) => {
        const otherTasks = s.tasks.filter((t) => t.project_id !== projectId)
        return { tasks: [...otherTasks, ...tasks], isLoading: false }
      })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  create: async (input) => {
    const task = await TasksRepository.create(input)
    set((s) => ({ tasks: [task, ...s.tasks] }))
    return task
  },

  update: async (id, input) => {
    const updated = await TasksRepository.update(id, input)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
    return updated
  },

  remove: async (id) => {
    await TasksRepository.delete(id)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  cycleStatus: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) throw new Error(`Task ${id} not found`)
    const newStatus = STATUS_CYCLE[task.status]
    return get().update(id, { status: newStatus, blocked_reason: '' })
  },
}))
