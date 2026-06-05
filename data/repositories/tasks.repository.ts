'use client'

import { db } from '@/data/db/client'
import type { Task, TaskCreateInput, TaskUpdateInput } from '@/types/entities'

function nowISO() { return new Date().toISOString() }
function uuid()   { return crypto.randomUUID() }

export const TasksRepository = {
  async findAll(): Promise<Task[]> {
    return db.tasks.orderBy('updated_at').reverse().toArray()
  },

  async findByProject(projectId: string): Promise<Task[]> {
    return db.tasks.where('project_id').equals(projectId).reverse().sortBy('updated_at')
  },

  async findById(id: string): Promise<Task | undefined> {
    return db.tasks.get(id)
  },

  async create(input: TaskCreateInput): Promise<Task> {
    const now = nowISO()
    const task: Task = { ...input, id: uuid(), created_at: now, updated_at: now }
    await db.tasks.add(task)
    return task
  },

  async update(id: string, input: TaskUpdateInput): Promise<Task> {
    const existing = await db.tasks.get(id)
    if (!existing) throw new Error(`Task ${id} not found`)
    const updated: Task = { ...existing, ...input, updated_at: nowISO() }
    await db.tasks.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.tasks.delete(id)
  },

  async deleteByProject(projectId: string): Promise<void> {
    await db.tasks.where('project_id').equals(projectId).delete()
  },
}
