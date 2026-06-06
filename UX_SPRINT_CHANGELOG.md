# UX Sprint Changelog

## Phase 1 — Typography: Heebo Hebrew Font
**Status:** ✅ Complete
- Replaced Geist Sans with Heebo (Hebrew + Latin subsets)
- Wired `--font-sans` → `--font-heebo` in globals.css
- Body font-size 15px, line-height 1.6
- `:lang(he)` kerning + font-smoothing rule
- Commit: `4dc2a7d`

## Phase 2 — Full Hebrew Localization
**Status:** ✅ Complete
- **AssetsListPage**: Hebrew type labels (פרומפט/סוכן/GPT/תהליך/כלי/הגדרות מודל), status labels, tabs, TopBar, empty state
- **AssetDetailPage**: All section titles, breadcrumb, button labels, dialog text, meta row labels, dates in d/M/yyyy
- **AssetForm**: Labels, placeholders, error messages, buttons
- **DecisionsListPage**: Status labels (פעיל/הוחלף/בוטל), tabs, TopBar, empty state
- **DecisionDetailPage**: Section titles (הקשר/אפשרויות שנשקלו/ההחלטה/נימוק), meta labels, dialog, breadcrumb
- **DecisionForm**: All labels, placeholders, buttons
- **SettingsPage**: Full Hebrew — section titles, data labels, import/export/clear UI, dialog
- **ProjectDetailPage**: Inline Hebrew maps for asset_type, asset.status, decision status, knowledge item_type; dates in d/M/yyyy
- **KnowledgeDetailPage**: Dates in d/M/yyyy
- RTL logical properties: replaced `mr-`/`ml-` with `me-`/`ms-`, `text-right` with `text-end` throughout

## Phase 3 — RTL Layout Fixes
**Status:** ✅ Complete
- **DashboardPage**: `ArrowRight` → `ArrowLeft` for FocusCard nav; "מוכן להתחיל" section icon `ArrowRight` → `Play` (direction-agnostic)
- **AssetsListPage**: Row nav `ChevronRight` → `ChevronLeft`
- **DecisionsListPage**: Row nav `ChevronRight` → `ChevronLeft`
- **KnowledgeListPage**: Row nav `ChevronRight` → `ChevronLeft`
- **dropdown-menu.tsx**: `ml-auto` → `ms-auto` in SubTrigger and Shortcut
- **AssetDetailPage**: `[&_svg]:ml-1` → `[&_svg]:ms-1` in SelectTrigger (×2)
- **AssetForm**: Loader2 `mr-1.5` → `me-1.5`
- **DecisionDetailPage**: `[&_svg]:ml-1` → `[&_svg]:ms-1` in SelectTrigger
- **DecisionForm**: Loader2 `mr-1.5` → `me-1.5`
- ProjectsListPage line 250 `ChevronRight` intentionally kept — Kanban advance action, not navigation

## Phase 4 — Dashboard Command Center
**Status:** ✅ Complete
- **"פעולות הבאות"**: Flat next-action list for all visible active/scoped projects with `next_action` set (max 6, sorted by priority). Compact row: action text + project name + priority badge. Positioned between blocked section and Focus Now.
- **"מסמכים חסרים"**: Active/scoped projects with zero linked knowledge items highlighted in amber. Links to project detail. Loads `useKnowledgeStore` in the same `useEffect`. Only visible when some active/scoped projects lack docs.
- **"GPT לא מוגדר"**: Projects in `gpt_setup` workflow status highlighted in violet. Only visible when such projects exist.
- All three sections are data-driven: render only when the relevant signal has items.

## Phase 5 — Knowledge Visibility
**Status:** Pending

## Phase 6 — Visual Polish & Consistency
**Status:** Pending
