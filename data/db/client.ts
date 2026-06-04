'use client'

import Dexie, { type Table } from 'dexie'
import type { Project } from '@/types/entities'

class AppDatabase extends Dexie {
  projects!: Table<Project, string>

  constructor() {
    super('ai-pm-platform-v1')
    this.version(1).stores({
      projects: 'id, name, status, priority, created_at, updated_at',
    })
  }
}

export const db = new AppDatabase()
