export type ProjectStatus =
  | 'idea'
  | 'scoped'
  | 'active'
  | 'blocked'
  | 'completed'
  | 'deferred'
  | 'archived'

export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low' | 'unset'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  next_action: string
  created_at: string
  updated_at: string
}

export type ProjectCreateInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type ProjectUpdateInput = Partial<ProjectCreateInput>
