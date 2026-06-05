'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useKnowledgeStore } from '@/store/knowledge.store'
import { useProjectsStore } from '@/store/projects.store'
import { KnowledgeForm } from '@/features/knowledge/components/KnowledgeForm'

export default function EditKnowledge() {
  const params = useParams<{ id: string }>()
  const { items, load } = useKnowledgeStore()
  const { projects, load: loadProjects } = useProjectsStore()

  useEffect(() => {
    if (items.length === 0) load()
    if (projects.length === 0) loadProjects()
  }, [items.length, projects.length, load, loadProjects])

  const item = items.find((i) => i.id === params.id)
  if (!item) return null

  return <KnowledgeForm mode="edit" item={item} />
}
