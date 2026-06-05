'use client'

import { db } from '@/data/db/client'
import type { Project, ProjectCreateInput, ProjectUpdateInput } from '@/types/entities'

function nowISO() {
  return new Date().toISOString()
}

function uuid() {
  return crypto.randomUUID()
}

export const ProjectsRepository = {
  async findAll(): Promise<Project[]> {
    return db.projects.orderBy('updated_at').reverse().toArray()
  },

  async findById(id: string): Promise<Project | undefined> {
    return db.projects.get(id)
  },

  async create(input: ProjectCreateInput): Promise<Project> {
    const now = nowISO()
    const project: Project = {
      ...input,
      id: uuid(),
      created_at: now,
      updated_at: now,
    }
    await db.projects.add(project)
    return project
  },

  async update(id: string, input: ProjectUpdateInput): Promise<Project> {
    const existing = await db.projects.get(id)
    if (!existing) throw new Error(`Project ${id} not found`)
    const updated: Project = { ...existing, ...input, updated_at: nowISO() }
    await db.projects.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.projects, db.tasks, db.decisions, db.knowledge, db.project_assets], async () => {
      await db.projects.delete(id)
      await db.tasks.where('project_id').equals(id).delete()
      await db.decisions.where('project_id').equals(id).delete()
      await db.knowledge.where('project_id').equals(id).delete()
      await db.project_assets.where('project_id').equals(id).delete()
    })
  },

  async countByStatus(): Promise<Record<string, number>> {
    const all = await db.projects.toArray()
    const counts: Record<string, number> = {}
    for (const p of all) {
      counts[p.status] = (counts[p.status] ?? 0) + 1
    }
    return counts
  },
}
