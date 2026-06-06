# Hebrew Localization Plan — AI PM Platform

**Status:** Implemented  
**Date:** 2026-06-06  
**Scope:** Full Hebrew UI + RTL layout

---

## Strategy

- **Hebrew primary:** All user-facing labels, buttons, statuses, headers, and empty states → Hebrew
- **English preserved:** URLs, GitHub repo names, folder paths, GPT model names, doc_role internal values, product/brand names (Lovable, Vercel, Claude Code CLI)
- **RTL implementation:** `dir="rtl"` on `<html>` element — browser handles text direction and flex-row reversal. Tailwind logical properties (`border-e`, `border-s`, `me-*`, `ms-*`) replace physical properties where directionality matters

---

## Translation Table

### Navigation
| English | Hebrew |
|---------|--------|
| Dashboard | לוח בקרה |
| Projects | פרויקטים |
| Tasks | משימות |
| AI Assets | נכסי AI |
| Decisions | החלטות |
| Knowledge | ידע |
| Settings | הגדרות |

### Project Statuses
| English | Hebrew |
|---------|--------|
| Idea | רעיון |
| Scoped | באפיון |
| Active | פעיל |
| Blocked | חסום |
| Completed | הושלם |
| Deferred | נדחה |
| Archived | בארכיון |

### Priorities
| English | Hebrew |
|---------|--------|
| Critical | קריטי |
| High | גבוה |
| Medium | בינוני |
| Low | נמוך |

### Domains
| English | Hebrew |
|---------|--------|
| Personal | אישי |
| Work | עבודה |
| General | כללי |

### Task Statuses
| English | Hebrew |
|---------|--------|
| Todo | לביצוע |
| In Progress | בביצוע |
| Done | הושלם |
| Blocked | חסום |

### Project Types
| English | Hebrew |
|---------|--------|
| Software | תוכנה |
| AI Agent | סוכן AI |
| Automation | אוטומציה |
| Operations | תפעול |
| Research | מחקר |
| Personal | אישי |
| Infrastructure | תשתיות |

### Doc Roles (display labels only; internal values stay English)
| English | Hebrew |
|---------|--------|
| Handoff Document | מסמך מסירה |
| Implementation Blueprint | תכנית מימוש |
| UX Notes | הערות UX |
| Decisions Log | יומן החלטות |
| Execution Board | לוח ביצוע |
| Release Notes | הערות גרסה |
| Deployment Report | דו"ח פריסה |
| Recovery Report | דו"ח שחזור |

### Doc Status
| English | Hebrew |
|---------|--------|
| Draft | טיוטה |
| Current | עדכני |
| Outdated | ישן |

---

## RTL Implementation

| Component | Change |
|-----------|--------|
| `app/layout.tsx` | `lang="he"` + `dir="rtl"` on `<html>` |
| `Sidebar` outer border | `border-r` → `border-e` (logical inline-end) |
| Dashboard blocked card | `border-l-4 border-l-red-500` → `border-s-4 border-s-red-500` |
| Kanban priority cards | `border-l-[3px] border-l-*` → `border-s-[3px] border-s-*` |
| KPI strip separator | `border-l border-border` → `border-s border-border` |
| KPI first-item padding | `pl-0` → `ps-0` |
| Icon-button margins | `mr-1.5` → `me-1.5` throughout |
| Project name after icon | `ml-2` → `ms-2` |
| Text alignment in buttons | `text-left` → `text-start` |

---

## Files Modified

1. `app/layout.tsx`
2. `lib/constants/statuses.ts`
3. `lib/constants/priorities.ts`
4. `lib/constants/domains.ts`
5. `lib/constants/task-statuses.tsx`
6. `components/layout/Sidebar.tsx`
7. `components/layout/TopBar.tsx`
8. `features/dashboard/components/DashboardPage.tsx`
9. `features/projects/components/ProjectsListPage.tsx`
10. `features/projects/components/ProjectForm.tsx`
11. `features/projects/components/ProjectDetailPage.tsx`
12. `features/tasks/components/TasksListPage.tsx`
13. `features/tasks/components/TaskForm.tsx`
14. `features/tasks/components/TaskRow.tsx`
15. `features/knowledge/components/KnowledgeForm.tsx`
16. `features/knowledge/components/KnowledgeListPage.tsx`
17. `features/knowledge/components/KnowledgeDetailPage.tsx`
18. `features/search/components/CommandPalette.tsx`
19. `data/seed.ts`
