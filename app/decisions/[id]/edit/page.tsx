'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useDecisionsStore } from '@/store/decisions.store'
import { useProjectsStore } from '@/store/projects.store'
import { DecisionForm } from '@/features/decisions/components/DecisionForm'

export default function EditDecision() {
  const params = useParams<{ id: string }>()
  const { decisions, load } = useDecisionsStore()
  const { projects, load: loadProjects } = useProjectsStore()

  useEffect(() => {
    if (decisions.length === 0) load()
    if (projects.length === 0) loadProjects()
  }, [decisions.length, projects.length, load, loadProjects])

  const decision = decisions.find((d) => d.id === params.id)
  if (!decision) return null

  return <DecisionForm mode="edit" decision={decision} />
}
