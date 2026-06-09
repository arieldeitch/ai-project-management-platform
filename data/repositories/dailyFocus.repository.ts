'use client'

import { db } from '@/data/db/client'
import type { DailyFocus, DailyFocusCreateInput, DailyFocusUpdateInput } from '@/types/entities'

function nowISO()    { return new Date().toISOString() }
function uuid()      { return crypto.randomUUID() }
function todayDate() { return new Date().toISOString().split('T')[0] }

export const DailyFocusRepository = {
  async create(input: DailyFocusCreateInput): Promise<DailyFocus> {
    const now = nowISO()
    const item: DailyFocus = { ...input, id: uuid(), created_at: now, updated_at: now }
    await db.daily_focus.add(item)
    return item
  },

  async update(id: string, input: DailyFocusUpdateInput): Promise<DailyFocus> {
    const existing = await db.daily_focus.get(id)
    if (!existing) throw new Error(`DailyFocus ${id} not found`)
    const updated: DailyFocus = { ...existing, ...input, updated_at: nowISO() }
    await db.daily_focus.put(updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    await db.daily_focus.delete(id)
  },

  async getByDate(date: string): Promise<DailyFocus[]> {
    return db.daily_focus.where('focus_date').equals(date).reverse().sortBy('created_at')
  },

  async getActiveToday(): Promise<DailyFocus[]> {
    const items = await db.daily_focus.where('focus_date').equals(todayDate()).toArray()
    return items.filter((f) => f.status === 'active')
  },

  async markDone(id: string): Promise<DailyFocus> {
    return DailyFocusRepository.update(id, { status: 'done' })
  },

  async markDeferred(id: string): Promise<DailyFocus> {
    return DailyFocusRepository.update(id, { status: 'deferred' })
  },
}
