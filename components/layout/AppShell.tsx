'use client'

import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { CommandPalette } from '@/features/search/components/CommandPalette'
import { useProjectsStore } from '@/store/projects.store'
import { useTasksStore } from '@/store/tasks.store'
import { useAssetsStore } from '@/store/assets.store'
import { useDecisionsStore } from '@/store/decisions.store'
import { useKnowledgeStore } from '@/store/knowledge.store'

function DataLoader() {
  const loadProjects   = useProjectsStore((s) => s.load)
  const loadTasks      = useTasksStore((s) => s.load)
  const loadAssets     = useAssetsStore((s) => s.load)
  const loadDecisions  = useDecisionsStore((s) => s.load)
  const loadKnowledge  = useKnowledgeStore((s) => s.load)

  useEffect(() => {
    loadProjects()
    loadTasks()
    loadAssets()
    loadDecisions()
    loadKnowledge()
  }, [loadProjects, loadTasks, loadAssets, loadDecisions, loadKnowledge])

  return null
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
      <DataLoader />
      <CommandPalette />
    </div>
  )
}
