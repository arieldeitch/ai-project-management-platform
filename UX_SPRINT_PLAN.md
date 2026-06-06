# UX Sprint Plan — Hebrew-First Solo Founder Platform

**Goal:** Make the platform usable every day by a Hebrew-speaking solo founder.
**Constraint:** No new business logic, no new entities, no workflow engine changes.

---

## Current State Audit

### Typography
- Geist Sans (Latin-only Google font) used as primary font — poor Hebrew rendering
- No Hebrew-specific font loaded
- `--font-display` is aliased to `--font-sans` (same Geist Sans)
- Geist Mono used for code/monospace — keep as-is

### Hebrew / RTL
- `lang="he" dir="rtl"` on `<html>` — correct
- Tailwind RTL logical properties used throughout (`me/ms`, `ps/pe`, `border-s/e`) — correct
- `ArrowRight` used for "go to item" in LTR style — needs fixing to `ArrowLeft` or `ChevronLeft` in RTL

### Dashboard
- Has: stat cards, blocked panel, focus project, active list, scoped list, idea list
- Missing: next-actions by project, missing GPT setup alert, missing docs alert
- Dashboard already good structure, needs enrichment

### Knowledge
- Basic flat list with type filter tabs
- No documentation health view
- No critical-docs summary by project
- Missing role-based grouping (gpt_specification, handoff_document, etc.)

### Visual
- Design system is solid (oklch colors, shadow scale, spacing)
- Some inconsistency in card padding across features
- Domain tabs / filter bars consistent
- Empty states consistent

---

## Phases

### Phase 1 — Typography: Heebo Hebrew Font
- Replace Geist Sans with **Heebo** (Google Fonts, covers Hebrew + Latin)
- Keep Geist Mono for all monospace/code
- Update `app/layout.tsx` to load Heebo
- Update `app/globals.css` to wire Heebo to `--font-sans`
- Adjust font sizes: Hebrew body benefits from `text-[15px]` body baseline

### Phase 2 — Full Hebrew Localization
- Audit all `.tsx` files for remaining English UI strings
- Targets: buttons, labels, placeholders, error messages, empty states
- Pages to check: ProjectDetailPage, TasksPage, SettingsPage, AssetsPage,
  DecisionsPage, forms, shared components
- Do NOT translate code-level values (status keys, type strings, etc.)

### Phase 3 — RTL Layout Fixes
- Replace all `ArrowRight` "navigate" icons with `ArrowLeft` (RTL direction)
- Check any hardcoded `left/right` CSS that bypasses logical properties
- Verify Sidebar is on the correct (right→end) side
- Fix any `text-left`/`text-right` that should be `text-start`/`text-end`

### Phase 4 — Dashboard Command Center
Add new sections to DashboardPage:
- **פעולות הבאות** (Next Actions): projects in `in_development/testing/active/deployed`
  that have a `next_action` set, sorted by priority
- **מסמכים חסרים** (Missing Docs): lifecycle projects missing critical docs
  (gpt_specification, handoff_document, implementation_blueprint) — inline summary
- **GPT לא מוגדר** (GPT Setup incomplete): projects in `gpt_setup` missing
  assigned_gpt / gpt_role / knowledge_uploaded
- Loads knowledge store for doc-health computation
- Sections only visible when data exists

### Phase 5 — Knowledge Visibility
Upgrade KnowledgeListPage:
- Add **Documentation Health** panel at top: grouped by critical doc role,
  showing which projects have/missing gpt_specification, handoff_document,
  implementation_blueprint, release_notes, deployment_report
- Add **"לפי תפקיד מסמך"** filter tab alongside type tabs
- Show doc_role badge on each row when present
- Add project name as subtitle on each row (not just in detail)
- Highlight `doc_status === 'current'` vs `'outdated'` vs `'draft'`

### Phase 6 — Visual Polish & Consistency
- Audit card padding: standardize to `p-4` for list rows, `p-5` for detail cards
- Fix font weight hierarchy: headers `font-semibold`, body `font-normal`
- Consistent hover states across all interactive rows
- Ensure focus ring visible for keyboard nav
- Check loading skeletons / empty states for consistency
- Remove any orphaned English strings found during audit

---

## Decisions Already Made
| Decision | Choice |
|---|---|
| Hebrew font | Heebo (Google Fonts, no npm package) |
| RTL logical props | Keep existing Tailwind RTL classes |
| New entities | None |
| Dashboard layout | Extend existing layout with new sections |
| Knowledge view | Extend existing list + add health panel |

---

## Changelog
See `UX_SPRINT_CHANGELOG.md`
