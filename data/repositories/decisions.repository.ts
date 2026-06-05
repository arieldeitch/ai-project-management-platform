'use client'

import { db } from '@/data/db/client'
import type { Decision, DecisionCreateInput, DecisionUpdateInput } from '@/types/entities'

function nowISO() { return new Date().toISOString() }
function uuid()   { return crypto.randomUUID() }

export const DecisionsRepository = {
  async findAll(): Promise<Decision[]> {
    return db.decisions.orderBy('updated_at').reverse().toArray()
  },

  async findById(id: string): Promise<Decision | undefined> {
    return db.decisions.get(id)
  },

  async findByProject(projectId: string): Promise<Decision[]> {
    return db.decisions.where('project_id').equals(projectId).reverse().sortBy('updated_at')
  },

  async create(input: DecisionCreateInput): Promise<Decision> {
    const now      = nowISO()
    const decision: Decision = { ...input, id: uuid(), created_at: now, updated_at: now }
    await db.decisions.add(decision)
    return decision
  },

  async update(id: string, input: DecisionUpdateInput): Promise<Decision> {
    const existing = await db.decisions.get(id)
    if (!existing) throw new Error(`Decision ${id} not found`)
    const updated: Decision = { ...existing, ...input, updated_at: nowISO() }
    await db.decisions.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.decisions.delete(id)
  },
}
