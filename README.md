# AI Project Management Platform

A local-first personal project management platform for AI practitioners managing multiple projects across domains (personal, work, general).

Built as a replacement for Excel-based project tracking. No accounts, no cloud sync, no collaboration — just fast, reliable portfolio visibility on your own machine.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Persistence | Dexie.js 4 (IndexedDB, local-first) |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 (`@theme inline {}` — no config file) |
| UI Components | shadcn/ui (copy-paste, not a package dependency) |
| Search | Fuse.js 7 (client-side fuzzy search) |
| Date utilities | date-fns 4 |

**Important:** This project uses Tailwind CSS v4. There is no `tailwind.config.js`. Design tokens are defined via `@theme inline {}` in `app/globals.css`. Do not introduce a config file.

---

## Getting Started

```bash
cd platform
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features

- **Dashboard** — Portfolio overview with domain tabs, blocked projects band, Focus Now card, stat counters
- **Projects** — Full CRUD with inline editing, status/domain/priority tracking, cascade delete
- **Tasks** — Cross-project and per-project task management with status cycling
- **AI Assets** — Library for prompts, agents, tools, datasets, models — linkable to projects
- **Decisions** — Decision log with status tracking (Active / Superseded / Reversed)
- **Knowledge** — Knowledge base with type tabs (Notes, Process, Reference, Lessons)
- **Search** — Global fuzzy search via ⌘K command palette
- **Settings** — JSON export/import, data reset

---

## Architecture

```
app/                   Next.js App Router pages
components/
  layout/              AppShell, Sidebar, TopBar
  shared/              StatusBadge, PriorityBadge, EmptyState, CommandPalette
  ui/                  shadcn/ui components
features/              One folder per domain (projects, tasks, assets, decisions, knowledge, dashboard, settings)
store/                 Zustand slices — one per domain
data/
  db/                  Dexie schema + seed data
  repositories/        TypeScript repository classes (ProjectsRepository, TasksRepository, etc.)
lib/
  constants/           Status configs, priority configs
  hooks/               useDataLoader (search index warm-up)
  utils.ts
types/
  entities.ts          All entity type definitions
```

**Hard rules:**
- UI components never import from `data/` directly
- Stores never import from `data/db/` directly
- All persistence flows through repository classes

---

## Data Model

All data lives in IndexedDB via Dexie.js. No server, no network requests.

| Entity | Key fields |
|---|---|
| `projects` | name, status, domain, priority, goal, next_action, phase, blocked_reason |
| `tasks` | title, status, project_id, blocked_reason, notes |
| `assets` | name, asset_type, content, url, tags |
| `project_assets` | project_id, asset_id (join table) |
| `decisions` | title, status, context, outcome, alternatives, project_id |
| `knowledge` | title, item_type, body, source, tags, project_id |

---

## Build Validation

```bash
npx tsc --noEmit     # must return 0 errors
npx next build       # must show all 21 routes
```
