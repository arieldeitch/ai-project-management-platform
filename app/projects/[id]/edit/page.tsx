'use client'

import { useEffect } from 'react'
import { useProjectsStore } from '@/store/projects.store'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import { use } from 'react'

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { projects, load } = useProjectsStore()

  useEffect(() => {
    if (projects.length === 0) load()
  }, [projects.length, load])

  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  return <ProjectForm mode="edit" project={project} />
}
