'use client'

import { db } from '@/data/db/client'
import type { KnowledgeItem, KnowledgeCreateInput, KnowledgeUpdateInput } from '@/types/entities'

function nowISO() { return new Date().toISOString() }
function uuid()   { return crypto.randomUUID() }

export const KnowledgeRepository = {
  async findAll(): Promise<KnowledgeItem[]> {
    return db.knowledge.orderBy('updated_at').reverse().toArray()
  },

  async findById(id: string): Promise<KnowledgeItem | undefined> {
    return db.knowledge.get(id)
  },

  async findByProject(projectId: string): Promise<KnowledgeItem[]> {
    return db.knowledge.where('project_id').equals(projectId).reverse().sortBy('updated_at')
  },

  async create(input: KnowledgeCreateInput): Promise<KnowledgeItem> {
    const now  = nowISO()
    const item: KnowledgeItem = { ...input, id: uuid(), created_at: now, updated_at: now }
    await db.knowledge.add(item)
    return item
  },

  async update(id: string, input: KnowledgeUpdateInput): Promise<KnowledgeItem> {
    const existing = await db.knowledge.get(id)
    if (!existing) throw new Error(`Knowledge item ${id} not found`)
    const updated: KnowledgeItem = { ...existing, ...input, updated_at: nowISO() }
    await db.knowledge.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.knowledge.delete(id)
  },
}
