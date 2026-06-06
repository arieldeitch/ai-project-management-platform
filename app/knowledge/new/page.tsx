'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useProjectsStore } from '@/store/projects.store'
import { KnowledgeForm } from '@/features/knowledge/components/KnowledgeForm'
import type { DocRole } from '@/types/entities'

function NewKnowledgeInner() {
  const { projects, load } = useProjectsStore()
  const searchParams = useSearchParams()
  const defaultProjectId = searchParams.get('project') ?? undefined
  const defaultDocRole = (searchParams.get('doc_role') ?? undefined) as DocRole | undefined

  useEffect(() => { if (projects.length === 0) load() }, [projects.length, load])

  return (
    <KnowledgeForm
      mode="create"
      defaultProjectId={defaultProjectId}
      defaultDocRole={defaultDocRole}
    />
  )
}

export default function NewKnowledge() {
  return (
    <Suspense>
      <NewKnowledgeInner />
    </Suspense>
  )
}
