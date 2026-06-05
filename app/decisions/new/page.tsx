'use client'

import { useEffect } from 'react'
import { useProjectsStore } from '@/store/projects.store'
import { DecisionForm } from '@/features/decisions/components/DecisionForm'

export default function NewDecision() {
  const { projects, load } = useProjectsStore()
  useEffect(() => { if (projects.length === 0) load() }, [projects.length, load])
  return <DecisionForm mode="create" />
}
