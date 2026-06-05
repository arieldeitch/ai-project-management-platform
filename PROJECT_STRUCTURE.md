# Project Structure

## Directory Layout

```
platform/
├── app/                          Next.js App Router
│   ├── layout.tsx                Root layout (AppShell)
│   ├── page.tsx                  Redirects to /dashboard
│   ├── globals.css               Design tokens (Tailwind v4 @theme inline)
│   ├── dashboard/page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── tasks/page.tsx
│   ├── assets/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── decisions/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   ├── knowledge/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── edit/page.tsx
│   └── settings/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          Root shell — sidebar + main content
│   │   ├── Sidebar.tsx           Navigation sidebar
│   │   └── TopBar.tsx            Per-page top bar (title: ReactNode, actions slot)
│   ├── shared/
│   │   ├── StatusBadge.tsx       Pill + dot badge for project/decision status
│   │   ├── PriorityBadge.tsx     Pill + dot badge for priority
│   │   ├── EmptyState.tsx        Empty state with icon-in-circle design
│   │   └── CommandPalette.tsx    Global ⌘K search overlay
│   └── ui/                       shadcn/ui components (copy-paste)
│
├── features/                     One folder per domain
│   ├── dashboard/components/DashboardPage.tsx
│   ├── projects/components/
│   │   ├── ProjectsListPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   └── ProjectForm.tsx
│   ├── tasks/components/
│   │   ├── TasksListPage.tsx
│   │   ├── TaskRow.tsx
│   │   └── TaskForm.tsx
│   ├── assets/components/
│   │   ├── AssetsListPage.tsx
│   │   ├── AssetDetailPage.tsx
│   │   └── AssetForm.tsx
│   ├── decisions/components/
│   │   ├── DecisionsListPage.tsx
│   │   ├── DecisionDetailPage.tsx
│   │   └── DecisionForm.tsx
│   ├── knowledge/components/
│   │   ├── KnowledgeListPage.tsx
│   │   ├── KnowledgeDetailPage.tsx
│   │   └── KnowledgeForm.tsx
│   └── settings/components/SettingsPage.tsx
│
├── store/                        Zustand slices
│   ├── projects.store.ts
│   ├── tasks.store.ts
│   ├── assets.store.ts
│   ├── decisions.store.ts
│   ├── knowledge.store.ts
│   ├── search.store.ts           Controls command palette open/close
│   └── ui.store.ts
│
├── data/
│   ├── db/
│   │   ├── index.ts              Dexie database instance
│   │   ├── schema.ts             Table definitions + migrations
│   │   └── seed.ts               27-project seed dataset
│   └── repositories/
│       ├── projects.repository.ts    Includes cascade delete
│       ├── tasks.repository.ts
│       ├── assets.repository.ts
│       ├── decisions.repository.ts
│       └── knowledge.repository.ts
│
├── lib/
│   ├── constants/
│   │   ├── task-statuses.tsx     Status configs with Lucide icons
│   │   ├── project-statuses.ts
│   │   └── priorities.ts
│   ├── hooks/
│   │   └── useDataLoader.ts      Warms Fuse.js search index at app boot
│   └── utils.ts                  cn() + shared helpers
│
└── types/
    └── entities.ts               All entity type definitions (source of truth)
```

## Data Flow

```
UI Component
  → Zustand Store action
    → Repository method
      → Dexie.js (IndexedDB)
```

Each layer only talks to the layer directly below it. UI never touches repositories. Stores never touch Dexie directly.

## Design Token Location

`app/globals.css` — all design tokens via Tailwind v4 `@theme inline {}`. Key tokens:

```css
--background:     oklch(0.975 0.004 264)  /* warm off-white */
--card:           oklch(1 0 0)            /* pure white */
--primary:        oklch(0.50 0.20 264)    /* indigo */
--border:         oklch(0.885 0.006 264)  /* warm tinted */
--sidebar:        oklch(0.960 0.005 264)
```
