export type ProjectStatus =
  | 'idea'
  | 'scoped'
  | 'active'
  | 'blocked'
  | 'completed'
  | 'deferred'
  | 'archived'

export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low' | 'unset'

export type ProjectDomain = 'personal' | 'work' | 'general'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  next_action: string
  /* Phase 2 enrichment */
  domain?: ProjectDomain
  goal?: string
  current_phase?: string
  blocked_reason?: string
  created_at: string
  updated_at: string
}

export type ProjectCreateInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type ProjectUpdateInput = Partial<ProjectCreateInput>

/* ── Task (Phase 3) ─────────────────────────────────────────── */
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  project_id: string | null
  title: string
  status: TaskStatus
  priority: TaskPriority
  notes: string
  blocked_reason: string
  created_at: string
  updated_at: string
}

export type TaskCreateInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type TaskUpdateInput = Partial<TaskCreateInput>

/* ── AI Asset (Phase 4) ─────────────────────────────────────── */
export type AssetType = 'prompt' | 'agent' | 'gpt' | 'workflow' | 'tool' | 'model_config'
export type AssetStatus = 'idea' | 'draft' | 'active' | 'deprecated'

export interface AIAsset {
  id: string
  name: string
  asset_type: AssetType
  status: AssetStatus
  description: string
  content: string
  created_at: string
  updated_at: string
}

export type AssetCreateInput = Omit<AIAsset, 'id' | 'created_at' | 'updated_at'>
export type AssetUpdateInput = Partial<AssetCreateInput>

export interface ProjectAsset {
  project_id: string
  asset_id: string
}

/* ── Decision (Phase 5) ─────────────────────────────────────── */
export type DecisionStatus = 'active' | 'superseded' | 'reversed'

export interface Decision {
  id: string
  project_id: string | null
  title: string
  context: string
  options_considered: string
  decision_made: string
  rationale: string
  status: DecisionStatus
  decided_at: string
  created_at: string
  updated_at: string
}

export type DecisionCreateInput = Omit<Decision, 'id' | 'created_at' | 'updated_at'>
export type DecisionUpdateInput = Partial<DecisionCreateInput>

/* ── Knowledge Item (Phase 5) ───────────────────────────────── */
export type KnowledgeType = 'note' | 'reference' | 'learning' | 'process' | 'research'

export interface KnowledgeItem {
  id: string
  project_id: string | null
  title: string
  item_type: KnowledgeType
  body: string
  source_url: string
  created_at: string
  updated_at: string
}

export type KnowledgeCreateInput = Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>
export type KnowledgeUpdateInput = Partial<KnowledgeCreateInput>
