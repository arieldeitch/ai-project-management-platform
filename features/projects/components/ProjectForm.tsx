'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectsStore } from '@/store/projects.store'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectDomain,
  ProjectType,
  DataStorageType,
  PlatformType,
} from '@/types/entities'
import { getDraftFieldChecks } from '@/lib/workflow/governance'

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft',                 label: 'טיוטה' },
  { value: 'scoped',                label: 'ממוסגר' },
  { value: 'gpt_setup',             label: 'הגדרת GPT' },
  { value: 'ready_for_development', label: 'מוכן לפיתוח' },
  { value: 'in_development',        label: 'בפיתוח' },
  { value: 'testing',               label: 'בבדיקה' },
  { value: 'deployed',              label: 'מוצב' },
  { value: 'active',                label: 'פעיל' },
  { value: 'blocked',               label: 'חסום' },
  { value: 'completed',             label: 'הושלם' },
  { value: 'deferred',              label: 'נדחה' },
  { value: 'archived',              label: 'בארכיון' },
]

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'critical', label: 'קריטי' },
  { value: 'high',     label: 'גבוה' },
  { value: 'medium',   label: 'בינוני' },
  { value: 'low',      label: 'נמוך' },
  { value: 'unset',    label: 'ללא עדיפות' },
]

const DOMAIN_OPTIONS: { value: ProjectDomain; label: string }[] = [
  { value: 'personal', label: 'אישי' },
  { value: 'work',     label: 'עבודה' },
  { value: 'general',  label: 'כללי' },
]

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'software',       label: 'תוכנה' },
  { value: 'ai_agent',       label: 'סוכן AI' },
  { value: 'automation',     label: 'אוטומציה' },
  { value: 'operations',     label: 'תפעול' },
  { value: 'research',       label: 'מחקר' },
  { value: 'personal',       label: 'אישי' },
  { value: 'infrastructure', label: 'תשתיות' },
]

const DATA_STORAGE_OPTIONS: { value: DataStorageType; label: string }[] = [
  { value: 'local',        label: 'מקומי' },
  { value: 'cloud',        label: 'ענן' },
  { value: 'hybrid',       label: 'היברידי' },
  { value: 'not_relevant', label: 'לא רלוונטי' },
]

const PLATFORM_TYPE_OPTIONS: { value: PlatformType; label: string }[] = [
  { value: 'web',        label: 'Web' },
  { value: 'mobile',     label: 'Mobile' },
  { value: 'desktop',    label: 'Desktop' },
  { value: 'automation', label: 'אוטומציה' },
  { value: 'gpt_only',   label: 'GPT בלבד' },
  { value: 'other',      label: 'אחר' },
]

interface ProjectFormProps {
  mode: 'create' | 'edit'
  project?: Project
}

export function ProjectForm({ mode, project }: ProjectFormProps) {
  const router = useRouter()
  const { create, update } = useProjectsStore()

  const [name,                 setName]               = useState(project?.name ?? '')
  const [description,          setDesc]               = useState(project?.description ?? '')
  const [goal,                 setGoal]               = useState(project?.goal ?? '')
  const [domain,               setDomain]             = useState<ProjectDomain | ''>(project?.domain ?? '')
  const [projectType,          setProjectType]        = useState<ProjectType | ''>(project?.project_type ?? '')
  const [status,               setStatus]             = useState<ProjectStatus>(project?.status ?? 'draft')
  const [priority,             setPriority]           = useState<ProjectPriority>(project?.priority ?? 'unset')
  const [currentPhase,         setCurrentPhase]       = useState(project?.current_phase ?? '')
  const [nextAction,           setNextAction]         = useState(project?.next_action ?? '')
  const [blockedReason,        setBlockedReason]      = useState(project?.blocked_reason ?? '')
  const [assignedGpt,          setAssignedGpt]        = useState(project?.assigned_gpt ?? '')
  const [primaryWorkspace,     setPrimaryWorkspace]   = useState(project?.primary_workspace ?? '')
  const [repositoryUrl,        setRepositoryUrl]      = useState(project?.repository_url ?? '')
  const [githubProjectName,    setGithubProjectName]  = useState(project?.github_project_name ?? '')
  const [localFolderPath,      setLocalFolderPath]    = useState(project?.local_folder_path ?? '')
  const [productionUrl,        setProductionUrl]      = useState(project?.production_url ?? '')
  const [lovableUrl,           setLovableUrl]         = useState(project?.lovable_url ?? '')
  const [vercelUrl,            setVercelUrl]          = useState(project?.vercel_url ?? '')
  const [currentExecutionPath, setCurrentExecutionPath] = useState(project?.current_execution_path ?? '')
  /* GPT Setup fields */
  const [gptUrl,                setGptUrl]                = useState(project?.gpt_url ?? '')
  const [gptRole,               setGptRole]               = useState(project?.gpt_role ?? '')
  const [knowledgeUploaded,     setKnowledgeUploaded]     = useState<boolean>(project?.knowledge_uploaded ?? false)
  const [uploadedKnowledgeFiles,setUploadedKnowledgeFiles]= useState(project?.uploaded_knowledge_files ?? '')
  const [deploymentNotApplicable,setDeploymentNotApplicable] = useState<boolean>(project?.deployment_not_applicable ?? false)
  /* Draft requirement fields */
  const [idea,             setIdea]            = useState(project?.idea ?? '')
  const [targetAudience,   setTargetAudience]  = useState(project?.target_audience ?? '')
  const [dataStorageType,  setDataStorageType] = useState<DataStorageType | ''>(project?.data_storage_type ?? '')
  const [platformType,     setPlatformType]    = useState<PlatformType | ''>(project?.platform_type ?? '')
  const [reason,           setReason]          = useState(project?.reason ?? '')

  const [execContextOpen, setExecContextOpen] = useState(
    !!(project?.assigned_gpt || project?.primary_workspace || project?.repository_url)
  )
  const [draftOpen, setDraftOpen] = useState(
    mode === 'create' || project?.status === 'draft' || !project?.idea
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const isEdit  = mode === 'edit' && !!project
  const backUrl = isEdit ? `/projects/${project.id}` : '/projects'
  const title   = isEdit ? 'ערוך פרויקט' : 'פרויקט חדש'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('שם הפרויקט נדרש.'); return }
    if (status === 'blocked' && !blockedReason.trim()) {
      setError('אנא תאר מדוע פרויקט זה חסום.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        description,
        goal,
        domain: domain || undefined,
        project_type: projectType || undefined,
        status,
        priority,
        current_phase: currentPhase,
        next_action: nextAction,
        blocked_reason: status === 'blocked' ? blockedReason : '',
        assigned_gpt: assignedGpt || undefined,
        primary_workspace: primaryWorkspace || undefined,
        repository_url: repositoryUrl || undefined,
        github_project_name: githubProjectName || undefined,
        local_folder_path: localFolderPath || undefined,
        production_url: productionUrl || undefined,
        lovable_url: lovableUrl || undefined,
        vercel_url: vercelUrl || undefined,
        current_execution_path: currentExecutionPath || undefined,
        idea: idea || undefined,
        target_audience: targetAudience || undefined,
        data_storage_type: dataStorageType || undefined,
        platform_type: platformType || undefined,
        reason: reason || undefined,
        gpt_url: gptUrl || undefined,
        gpt_role: gptRole || undefined,
        knowledge_uploaded: knowledgeUploaded || undefined,
        uploaded_knowledge_files: uploadedKnowledgeFiles || undefined,
        deployment_not_applicable: deploymentNotApplicable || undefined,
      }
      if (isEdit) {
        await update(project.id, payload)
        router.push(`/projects/${project.id}`)
      } else {
        const p = await create(payload)
        router.push(`/projects/${p.id}`)
      }
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TopBar
        title={title}
        actions={
          <Link href={backUrl} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="me-1.5 h-3.5 w-3.5" />
            חזרה
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">שם הפרויקט <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוג' אפליקציית מעקב הרגלים"
                autoFocus
              />
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <Label htmlFor="goal">מטרה / יעד</Label>
              <Input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="איך נראה הצלחה?"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="הקשר, רעיונות, פרטים רלוונטיים..."
                rows={4}
              />
            </div>

            {/* Draft Requirements — gates progression to Scoped */}
            {(() => {
              const draftProxy = {
                idea, goal, target_audience: targetAudience,
                data_storage_type: dataStorageType || undefined,
                platform_type: platformType || undefined,
                project_type: projectType || undefined,
                priority, reason, next_action: nextAction,
              } as Parameters<typeof getDraftFieldChecks>[0]
              const checks = getDraftFieldChecks(draftProxy)
              const filledCount = checks.filter((c) => c.filled).length
              return (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10">
                  <button
                    type="button"
                    onClick={() => setDraftOpen(!draftOpen)}
                    className="flex w-full items-center justify-between px-4 py-3 text-start"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        דרישות טיוטה
                      </span>
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                        filledCount === checks.length
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      )}>
                        {filledCount}/{checks.length}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {draftOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {draftOpen && (
                    <div className="space-y-4 border-t border-amber-200 px-4 pb-4 pt-4 dark:border-amber-900/30">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        יש למלא את כל השדות הבאים לפני מעבר לשלב &quot;ממוסגר&quot;.
                      </p>

                      {/* Idea */}
                      <div className="space-y-1.5">
                        <Label htmlFor="idea">
                          רעיון / תפיסה <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="idea"
                          value={idea}
                          onChange={(e) => setIdea(e.target.value)}
                          placeholder="מה הרעיון המרכזי? מה הפרויקט עושה?"
                          rows={3}
                        />
                      </div>

                      {/* Target audience */}
                      <div className="space-y-1.5">
                        <Label htmlFor="target_audience">
                          קהל יעד <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="target_audience"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="מי ייהנה מהפרויקט? לדוג' אני, הצוות, לקוחות"
                        />
                      </div>

                      {/* Data storage + Platform type */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="data_storage_type">
                            סוג אחסון נתונים <span className="text-destructive">*</span>
                          </Label>
                          <Select value={dataStorageType} onValueChange={(v) => setDataStorageType(v as DataStorageType)}>
                            <SelectTrigger id="data_storage_type">
                              <SelectValue placeholder="בחר..." />
                            </SelectTrigger>
                            <SelectContent>
                              {DATA_STORAGE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="platform_type">
                            פלטפורמה <span className="text-destructive">*</span>
                          </Label>
                          <Select value={platformType} onValueChange={(v) => setPlatformType(v as PlatformType)}>
                            <SelectTrigger id="platform_type">
                              <SelectValue placeholder="בחר..." />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORM_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="space-y-1.5">
                        <Label htmlFor="reason">
                          סיבה עסקית / אישית <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="מדוע הפרויקט הזה חשוב? מה הבעיה שהוא פותר?"
                          rows={2}
                        />
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        שדות נוספים הנדרשים: <strong>מטרה</strong>, <strong>סוג פרויקט</strong>, <strong>עדיפות</strong>, <strong>פעולה הבאה</strong>
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">סטטוס</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">עדיפות</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority)}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type + Domain */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="project_type">סוג</Label>
                <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
                  <SelectTrigger id="project_type">
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="domain">תחום</Label>
                <Select value={domain} onValueChange={(v) => setDomain(v as ProjectDomain)}>
                  <SelectTrigger id="domain">
                    <SelectValue placeholder="בחר תחום" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Phase */}
            <div className="space-y-1.5">
              <Label htmlFor="current_phase">שלב נוכחי</Label>
              <Input
                id="current_phase"
                value={currentPhase}
                onChange={(e) => setCurrentPhase(e.target.value)}
                placeholder="לדוג' עיצוב, פיתוח, תפעולי"
              />
            </div>

            {/* Next action */}
            <div className="space-y-1.5">
              <Label htmlFor="next_action">פעולה הבאה</Label>
              <Input
                id="next_action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="הצעד הבא המיידי"
              />
            </div>

            {/* Blocked reason */}
            {status === 'blocked' && (
              <div className="space-y-1.5 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                <Label htmlFor="blocked_reason" className="text-red-700 dark:text-red-400">
                  סיבת חסימה <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="blocked_reason"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="מה חוסם את הפרויקט? מה צריך לקרות כדי לבטל את החסימה?"
                  rows={3}
                />
              </div>
            )}

            {/* Execution Context — collapsible */}
            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setExecContextOpen(!execContextOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-start"
              >
                <span className="text-sm font-medium">הקשר ביצוע</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {!execContextOpen && (assignedGpt || primaryWorkspace || repositoryUrl) && (
                    <span className="me-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      ממולא
                    </span>
                  )}
                  {execContextOpen
                    ? <ChevronUp className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                  }
                </span>
              </button>

              {execContextOpen && (
                <div className={cn('space-y-4 border-t border-border px-4 pb-4 pt-4')}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="assigned_gpt">GPT משויך</Label>
                      <Input
                        id="assigned_gpt"
                        value={assignedGpt}
                        onChange={(e) => setAssignedGpt(e.target.value)}
                        placeholder="לדוג' Claude Sonnet 4.6"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="primary_workspace">סביבת עבודה</Label>
                      <Input
                        id="primary_workspace"
                        value={primaryWorkspace}
                        onChange={(e) => setPrimaryWorkspace(e.target.value)}
                        placeholder="לדוג' Claude Code CLI"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gpt_url">קישור ל-GPT</Label>
                    <Input
                      id="gpt_url"
                      value={gptUrl}
                      onChange={(e) => setGptUrl(e.target.value)}
                      placeholder="https://chat.openai.com/g/..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gpt_role">תפקיד ה-GPT</Label>
                    <Textarea
                      id="gpt_role"
                      value={gptRole}
                      onChange={(e) => setGptRole(e.target.value)}
                      placeholder="מה ה-GPT עושה? איזה תפקיד הוא ממלא בפרויקט?"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="knowledge_uploaded"
                      checked={knowledgeUploaded}
                      onChange={(e) => setKnowledgeUploaded(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor="knowledge_uploaded" className="cursor-pointer">
                      קבצי Knowledge הועלו ל-GPT
                    </Label>
                  </div>

                  {knowledgeUploaded && (
                    <div className="space-y-1.5">
                      <Label htmlFor="uploaded_knowledge_files">קבצים שהועלו</Label>
                      <Input
                        id="uploaded_knowledge_files"
                        value={uploadedKnowledgeFiles}
                        onChange={(e) => setUploadedKnowledgeFiles(e.target.value)}
                        placeholder="לדוג' handoff.md, blueprint.md"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="deployment_not_applicable"
                      checked={deploymentNotApplicable}
                      onChange={(e) => setDeploymentNotApplicable(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor="deployment_not_applicable" className="cursor-pointer">
                      פריסה לא רלוונטית לפרויקט זה
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="repository_url">כתובת ריפו</Label>
                      <Input
                        id="repository_url"
                        value={repositoryUrl}
                        onChange={(e) => setRepositoryUrl(e.target.value)}
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="github_project_name">שם פרויקט GitHub</Label>
                      <Input
                        id="github_project_name"
                        value={githubProjectName}
                        onChange={(e) => setGithubProjectName(e.target.value)}
                        placeholder="owner/repo-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="local_folder_path">נתיב תיקייה מקומית</Label>
                    <Input
                      id="local_folder_path"
                      value={localFolderPath}
                      onChange={(e) => setLocalFolderPath(e.target.value)}
                      placeholder="C:/Users/..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="production_url">כתובת ייצור</Label>
                      <Input
                        id="production_url"
                        value={productionUrl}
                        onChange={(e) => setProductionUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vercel_url">כתובת Vercel</Label>
                      <Input
                        id="vercel_url"
                        value={vercelUrl}
                        onChange={(e) => setVercelUrl(e.target.value)}
                        placeholder="https://...vercel.app"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lovable_url">כתובת Lovable</Label>
                    <Input
                      id="lovable_url"
                      value={lovableUrl}
                      onChange={(e) => setLovableUrl(e.target.value)}
                      placeholder="https://...lovable.app"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="current_execution_path">נתיב ביצוע נוכחי</Label>
                    <Input
                      id="current_execution_path"
                      value={currentExecutionPath}
                      onChange={(e) => setCurrentExecutionPath(e.target.value)}
                      placeholder="תיאור ישיבת עבודה פעילה..."
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'שמור שינויים' : 'צור פרויקט'}
              </Button>
              <Link href={backUrl} className={buttonVariants({ variant: 'ghost' })}>
                ביטול
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
