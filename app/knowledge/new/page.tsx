'use client'

import { useEffect } from 'react'
import { useProjectsStore } from '@/store/projects.store'
import { KnowledgeForm } from '@/features/knowledge/components/KnowledgeForm'

export default function NewKnowledge() {
  const { projects, load } = useProjectsStore()
  useEffect(() => { if (projects.length === 0) load() }, [projects.length, load])
  return <KnowledgeForm mode="create" />
}
