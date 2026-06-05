'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { db } from '@/data/db/client'
import { ProjectsRepository } from '@/data/repositories/projects.repository'
import { SEED_PROJECTS } from '@/data/seed'
import { Download, Trash2, DatabaseZap, Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DataCounts {
  projects: number
  tasks: number
  assets: number
  decisions: number
  knowledge: number
}

async function getDataCounts(): Promise<DataCounts> {
  const [projects, tasks, assets, decisions, knowledge] = await Promise.all([
    db.projects.count(),
    db.tasks.count(),
    db.assets.count(),
    db.decisions.count(),
    db.knowledge.count(),
  ])
  return { projects, tasks, assets, decisions, knowledge }
}

export function SettingsPage() {
  const [counts, setCounts]           = useState<DataCounts | null>(null)
  const [importing, setImporting]     = useState(false)
  const [exporting, setExporting]     = useState(false)
  const [clearing, setClearing]       = useState(false)
  const [clearOpen, setClearOpen]     = useState(false)
  const [importMsg, setImportMsg]     = useState('')

  useEffect(() => {
    getDataCounts().then(setCounts)
  }, [])

  async function handleImportSeed() {
    setImporting(true)
    setImportMsg('')
    try {
      let created = 0
      for (const input of SEED_PROJECTS) {
        await ProjectsRepository.create(input)
        created++
      }
      const newCounts = await getDataCounts()
      setCounts(newCounts)
      setImportMsg(`Imported ${created} projects successfully.`)
    } catch (e) {
      setImportMsg(`Import failed: ${String(e)}`)
    } finally {
      setImporting(false)
    }
  }

  async function handleExportJSON() {
    setExporting(true)
    try {
      const [projects, tasks, assets, project_assets, decisions, knowledge] = await Promise.all([
        db.projects.toArray(),
        db.tasks.toArray(),
        db.assets.toArray(),
        db.project_assets.toArray(),
        db.decisions.toArray(),
        db.knowledge.toArray(),
      ])
      const blob = new Blob(
        [JSON.stringify({ projects, tasks, assets, project_assets, decisions, knowledge }, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `ai-pm-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function handleClearAll() {
    setClearing(true)
    try {
      await Promise.all([
        db.projects.clear(),
        db.tasks.clear(),
        db.assets.clear(),
        db.project_assets.clear(),
        db.decisions.clear(),
        db.knowledge.clear(),
      ])
      const newCounts = await getDataCounts()
      setCounts(newCounts)
      setImportMsg('All data cleared.')
    } finally {
      setClearing(false)
      setClearOpen(false)
    }
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden">
        <TopBar title="Settings" />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">

            {/* Data overview */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Data Overview
              </h2>
              <div className="rounded-lg border border-border bg-card">
                {counts ? (
                  <div className="grid grid-cols-5 divide-x divide-border">
                    {(
                      [
                        ['Projects',  counts.projects],
                        ['Tasks',     counts.tasks],
                        ['Assets',    counts.assets],
                        ['Decisions', counts.decisions],
                        ['Knowledge', counts.knowledge],
                      ] as const
                    ).map(([label, count]) => (
                      <div key={label} className="flex flex-col items-center py-5 gap-1">
                        <span className="text-2xl font-bold tabular-nums">{count}</span>
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </section>

            {/* Import sample data */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="flex items-start gap-3">
                <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Import Portfolio Data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Import all 27 projects from the original Excel spreadsheet. This adds projects
                    regardless of existing data — run only on an empty database to avoid duplicates.
                  </p>
                  {counts && counts.projects > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {counts.projects} projects already exist — importing will add duplicates.
                    </div>
                  )}
                  {importMsg && (
                    <p className="mt-2 text-xs text-muted-foreground">{importMsg}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleImportSeed}
                disabled={importing}
                size="sm"
                className="ml-8"
              >
                {importing
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Importing…</>
                  : <><DatabaseZap className="mr-1.5 h-3.5 w-3.5" />Import 27 projects</>
                }
              </Button>
            </section>

            {/* Export */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Export JSON Backup</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Download all data as a JSON file. Includes projects, tasks, assets, decisions,
                    and knowledge items.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleExportJSON}
                disabled={exporting}
                variant="outline"
                size="sm"
                className="ml-8"
              >
                {exporting
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Exporting…</>
                  : <><Download className="mr-1.5 h-3.5 w-3.5" />Export JSON</>
                }
              </Button>
            </section>

            {/* Clear all */}
            <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
              <div className="flex items-start gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-destructive">Clear All Data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Permanently delete all projects, tasks, assets, decisions, and knowledge items.
                    This cannot be undone. Export a backup first.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setClearOpen(true)}
                variant="destructive"
                size="sm"
                className="ml-8"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear all data
              </Button>
            </section>

          </div>
        </div>
      </div>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all{' '}
              {counts && counts.projects > 0 && <strong>{counts.projects} projects</strong>}
              {counts && counts.tasks > 0 && <>, {counts.tasks} tasks</>}
              {counts && counts.assets > 0 && <>, {counts.assets} assets</>}
              {counts && (counts.decisions > 0 || counts.knowledge > 0) && <>, and all decisions and knowledge items</>}.
              {' '}This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={clearing}>
              {clearing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
