'use client'

import { db } from '@/data/db/client'
import type { AIAsset, AssetCreateInput, AssetUpdateInput, ProjectAsset } from '@/types/entities'

function nowISO() { return new Date().toISOString() }
function uuid()   { return crypto.randomUUID() }

export const AssetsRepository = {
  async findAll(): Promise<AIAsset[]> {
    return db.assets.orderBy('updated_at').reverse().toArray()
  },

  async findById(id: string): Promise<AIAsset | undefined> {
    return db.assets.get(id)
  },

  async findByProject(projectId: string): Promise<AIAsset[]> {
    const links = await db.project_assets.where('project_id').equals(projectId).toArray()
    const ids   = links.map((l) => l.asset_id)
    return db.assets.where('id').anyOf(ids).toArray()
  },

  async getLinkedProjectIds(assetId: string): Promise<string[]> {
    const links = await db.project_assets.where('asset_id').equals(assetId).toArray()
    return links.map((l) => l.project_id)
  },

  async create(input: AssetCreateInput): Promise<AIAsset> {
    const now   = nowISO()
    const asset: AIAsset = { ...input, id: uuid(), created_at: now, updated_at: now }
    await db.assets.add(asset)
    return asset
  },

  async update(id: string, input: AssetUpdateInput): Promise<AIAsset> {
    const existing = await db.assets.get(id)
    if (!existing) throw new Error(`Asset ${id} not found`)
    const updated: AIAsset = { ...existing, ...input, updated_at: nowISO() }
    await db.assets.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.assets.delete(id)
    await db.project_assets.where('asset_id').equals(id).delete()
  },

  async linkToProject(assetId: string, projectId: string): Promise<void> {
    const existing = await db.project_assets.get([projectId, assetId])
    if (!existing) {
      await db.project_assets.add({ project_id: projectId, asset_id: assetId })
    }
  },

  async unlinkFromProject(assetId: string, projectId: string): Promise<void> {
    await db.project_assets.delete([projectId, assetId])
  },

  async duplicate(id: string): Promise<AIAsset> {
    const source = await db.assets.get(id)
    if (!source) throw new Error(`Asset ${id} not found`)
    return AssetsRepository.create({
      name:        `${source.name} (copy)`,
      asset_type:  source.asset_type,
      status:      'draft',
      description: source.description,
      content:     source.content,
    })
  },
}
