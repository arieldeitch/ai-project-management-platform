export type ProjectStatus =
  | 'draft'
  | 'scoped'
  | 'gpt_setup'
  | 'ready_for_development'
  | 'in_development'
  | 'testing'
  | 'deployed'
  | 'active'
  | 'blocked'
  | 'completed'
  | 'deferred'
  | 'archived'

export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low' | 'unset'

export type ProjectDomain = 'personal' | 'work' | 'general'

export type ProjectType =
  | 'software'
  | 'ai_agent'
  | 'automation'
  | 'operations'
  | 'research'
  | 'personal'
  | 'infrastructure'

export type DataStorageType = 'local' | 'cloud' | 'hybrid' | 'not_relevant'

export type PlatformType = 'web' | 'mobile' | 'desktop' | 'automation' | 'gpt_only' | 'other'

export type TaskType = 'task' | 'feature' | 'bug'

export type TaskScope = 'mvp' | 'later' | 'deferred'

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'

export type DocRole =
  | 'gpt_specification'
  | 'handoff_document'
  | 'implementation_blueprint'
  | 'ux_notes'
  | 'decisions_log'
  | 'execution_board'
  | 'release_notes'
  | 'deployment_report'
  | 'recovery_report'

export type DocStatus = 'draft' | 'current' | 'outdated'

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
  /* Governance — Project classification + Execution Context */
  project_type?: ProjectType
  assigned_gpt?: string
  primary_workspace?: string
  repository_url?: string
  github_project_name?: string
  local_folder_path?: string
  production_url?: string
  lovable_url?: string
  vercel_url?: string
  current_execution_path?: string
  /* Workflow Governance — Draft required fields */
  idea?: string
  target_audience?: string
  data_storage_type?: DataStorageType
  platform_type?: PlatformType
  reason?: string
  /* Workflow Governance — GPT Setup */
  gpt_url?: string
  gpt_role?: string
  knowledge_uploaded?: boolean
  uploaded_knowledge_files?: string
  /* Workflow Governance — Deployment exception */
  deployment_not_applicable?: boolean
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
  /* Workflow Governance — Task classification */
  task_type?: TaskType
  /* Feature fields */
  user_value?: string
  acceptance_criteria?: string
  scope?: TaskScope
  /* Bug fields */
  severity?: BugSeverity
  steps_to_reproduce?: string
  expected_behavior?: string
  actual_behavior?: string
  environment?: string
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
  /* Governance — Documentation Progress */
  doc_role?: DocRole
  doc_status?: DocStatus
  created_at: string
  updated_at: string
}

export type KnowledgeCreateInput = Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>
export type KnowledgeUpdateInput = Partial<KnowledgeCreateInput>

/* ── Daily Focus ────────────────────────────────────────────── */
export type DailyFocusStatus = 'active' | 'done' | 'deferred'

export interface DailyFocus {
  id: string
  project_id: string
  title: string
  note: string
  status: DailyFocusStatus
  created_task_id?: string
  focus_date: string  // YYYY-MM-DD
  created_at: string
  updated_at: string
}

export type DailyFocusCreateInput = Omit<DailyFocus, 'id' | 'created_at' | 'updated_at'>
export type DailyFocusUpdateInput = Partial<DailyFocusCreateInput>
