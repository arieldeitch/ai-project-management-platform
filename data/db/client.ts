'use client'

import Dexie, { type Table } from 'dexie'
import type { Project, Task, AIAsset, ProjectAsset, Decision, KnowledgeItem, DailyFocus } from '@/types/entities'

class AppDatabase extends Dexie {
  projects!:       Table<Project,      string>
  tasks!:          Table<Task,         string>
  assets!:         Table<AIAsset,      string>
  project_assets!: Table<ProjectAsset, [string, string]>
  decisions!:      Table<Decision,     string>
  knowledge!:      Table<KnowledgeItem, string>
  daily_focus!:    Table<DailyFocus,   string>

  constructor() {
    super('ai-pm-platform-v1')

    /* v1 — projects only */
    this.version(1).stores({
      projects: 'id, name, status, priority, created_at, updated_at',
    })

    /* v2 — add domain index to projects */
    this.version(2).stores({
      projects: 'id, name, status, priority, domain, created_at, updated_at',
    })

    /* v3 — tasks, assets, decisions, knowledge */
    this.version(3).stores({
      projects:       'id, name, status, priority, domain, created_at, updated_at',
      tasks:          'id, project_id, status, priority, created_at, updated_at',
      assets:         'id, name, asset_type, status, created_at, updated_at',
      project_assets: '[project_id+asset_id], project_id, asset_id',
      decisions:      'id, project_id, status, created_at, updated_at',
      knowledge:      'id, project_id, item_type, created_at, updated_at',
    })

    /* v4 — governance: project_type index on projects, doc_role index on knowledge */
    this.version(4).stores({
      projects:       'id, name, status, priority, domain, project_type, created_at, updated_at',
      tasks:          'id, project_id, status, priority, created_at, updated_at',
      assets:         'id, name, asset_type, status, created_at, updated_at',
      project_assets: '[project_id+asset_id], project_id, asset_id',
      decisions:      'id, project_id, status, created_at, updated_at',
      knowledge:      'id, project_id, item_type, doc_role, created_at, updated_at',
    })

    /* v5 — workflow governance: new lifecycle statuses, task_type index; migrate 'idea' → 'draft' */
    this.version(5).stores({
      projects:       'id, name, status, priority, domain, project_type, data_storage_type, platform_type, created_at, updated_at',
      tasks:          'id, project_id, status, priority, task_type, created_at, updated_at',
      assets:         'id, name, asset_type, status, created_at, updated_at',
      project_assets: '[project_id+asset_id], project_id, asset_id',
      decisions:      'id, project_id, status, created_at, updated_at',
      knowledge:      'id, project_id, item_type, doc_role, created_at, updated_at',
    }).upgrade(trans =>
      trans.table('projects').toCollection().modify((project: { status: string }) => {
        if (project.status === 'idea') project.status = 'draft'
      })
    )

    /* v6 — daily focus workspace */
    this.version(6).stores({
      daily_focus: 'id, project_id, status, focus_date, created_at, updated_at',
    })
  }
}

export const db = new AppDatabase()
