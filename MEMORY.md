# MEMORY.md — זיכרון פרויקט לשחזור סשן

> קובץ זה מאפשר ל-Claude לשחזר את מצב הפרויקט במלואו בתחילת כל סשן חדש.
> כתוב בעברית, למעט שמות טכניים, שמות קבצים, URLs, פקודות ומושגי קוד.

---

## 1. זהות הפרויקט

**שם:** פלטפורמת ניהול פרויקטים אישית עם AI

**מטרה:** מחליפה גיליון Excel ידני. מרכז אחד לניהול הפורטפוליו האישי — רעיונות, ביצוע, מעקב, ידע, ומשמעת תהליך.

**משתמש יעד:** משתמש יחיד, solo builder, מנהל פורטפוליו מעורב של פרויקטים אישיים ועסקיים.

**פילוסופיית מוצר:**
- כלי שמכריח משמעת — לא רק עוקב, אלא מאכף תהליך עבודה מסודר
- פשטות מרבית: אין צוותים, אין הרשאות, אין ביצועים מיותרים
- הכל מקומי, מהיר, ישיר
- מייצג את המציאות, לא את הרצוי

**רמת בגרות:** MVP תפעולי — האפליקציה עובדת ובשימוש יומיומי. הממשק הועבר לעברית מלאה. העבודה הבאה היא ממשל תהליך עבודה.

---

## 2. סגנון עבודה של המשתמש

- **עברית ראשית** — כל הממשק בעברית. ערכים טכניים (URLs, שמות קבצים, GPT names, נתיבים) נשארים באנגלית.
- **solo builder** — המשתמש בונה לבד עם Claude כשותף טכני.
- **פיתוח בעזרת AI** — Claude Code CLI הוא הסביבה הראשית לפיתוח.
- **מבנה ומשמעת** — המשתמש רוצה מערכת שמכריחה עבודה מסודרת, לא מאפשרת דילוגים.
- **ללא מורכבות enterprise** — אסור להוסיף תשתית מיותרת, abstractions מיותרים, או תכנון ל-use cases היפותטיים.
- **מימוש מעשי > תכנון מופשט** — עדיף לבנות מהר ולתקן, לא לתכנן שבועות.
- **Claude = שותף טכני ראשי** — Claude צריך להציע, לבקר, לזהות בעיות, לא רק לבצע הוראות.

---

## 3. עקרונות ליבה של המוצר

| עיקרון | פירוש |
|--------|-------|
| Desktop first | ממשק למסך מחשב. מובייל אינו עדיפות. |
| Local first | נתונים ב-IndexedDB בדפדפן. אין backend כרגע. |
| משתמש יחיד | אין צוותים, אין שיתוף, אין הרשאות. |
| פורטפוליו ראשון | המבט הראשי הוא על כלל הפרויקטים, לא על פרויקט בודד. |
| ממשל תהליך | המערכת מכריחה מילוי שדות נדרשים לפני מעבר שלב. |
| משמעת ידע | כל פרויקט חייב מסמכי ליווי מוגדרים (handoff, blueprint, וכו'). |
| ללא auth | אין התחברות, אין משתמשים, אין sessions. |
| ללא cloud sync | הנתונים מקומיים. סנכרון עתידי אפשרי אך לא מתוכנן. |
| ללא enterprise | אין billing, אין multi-tenant, אין workflow engine חיצוני. |

---

## 4. מצב האפליקציה הנוכחי

### מה בנוי וקיים

- **Framework:** Next.js 16.2.7 (App Router), React 19, TypeScript 5 strict
- **Persistence:** Dexie.js 4 (IndexedDB) — local-first, ללא backend
- **State:** Zustand 5 stores — `useProjectsStore`, `useTasksStore`, `useKnowledgeStore`, `useAssetsStore`, `useDecisionsStore`, `useSearchStore`
- **Styling:** Tailwind CSS v4 — `@theme inline {}`, ללא `tailwind.config.js`. תמיכה ב-`rtl:` variants ו-logical properties.
- **21 routes:** dashboard, projects, projects/[id], projects/[id]/edit, projects/new, tasks, assets, assets/[id], assets/[id]/edit, assets/new, decisions, decisions/[id], decisions/[id]/edit, decisions/new, knowledge, knowledge/[id], knowledge/[id]/edit, knowledge/new, settings, /, /_not-found

### מסכים קיימים

| מסך | מצב |
|-----|-----|
| Dashboard | קיים — KPI cards, סינון תחום, פורטפוליו חסום/פוקוס/פעיל/רעיונות |
| Projects (Kanban) | קיים — עמודות לפי סטטוס, KPI strip, priority borders, סינון תחום |
| Project Detail | קיים — tabs: סקירה, משימות, נכסי AI, החלטות, ידע |
| Tasks | קיים — view filters, groups by project |
| AI Assets | קיים |
| Decisions | קיים |
| Knowledge | קיים — type filter tabs, doc_role, doc_status |
| Settings | קיים — import/export JSON |
| Command Palette | קיים — Ctrl+K, חיפוש בכל הישויות |

### לוקליזציה

**Localization Pass #1 הושלם** (commit `3c4c2f4`):
- `dir="rtl"` + `lang="he"` על `<html>` ב-`app/layout.tsx`
- כל תוויות ה-UI, כפתורים, טפסים, dialogs — עברית
- logical properties בכל מקום: `border-s/e`, `ms/me`, `ps/pe`, `text-start/end`
- 27 פרויקטי seed מתורגמים לעברית (ערכים טכניים נשארו באנגלית)

### שדות ממשל שנוספו לפרויקט

- `project_type`: software | ai_agent | automation | operations | research | personal | infrastructure
- `assigned_gpt`: שם ה-GPT המשויך
- `primary_workspace`: סביבת העבודה הראשית
- `repository_url`: כתובת ה-repo
- `github_project_name`: שם הפרויקט ב-GitHub
- `local_folder_path`: נתיב תיקייה מקומית
- `production_url`: כתובת ייצור
- `lovable_url`: כתובת Lovable (אם קיים)
- `vercel_url`: כתובת Vercel (אם קיים)
- `current_execution_path`: תיאור שלב הביצוע הנוכחי

### שדות ממשל על KnowledgeItem

- `doc_role`: handoff_document | implementation_blueprint | ux_notes | decisions_log | execution_board | release_notes | deployment_report | recovery_report
- `doc_status`: draft | current | outdated

---

## 5. Repository ו-Deployment

| פרט | ערך |
|-----|-----|
| GitHub | https://github.com/arieldeitch/ai-project-management-platform |
| ענף | main |
| תיקיית שורש של האפליקציה | `platform` |
| הרצה מקומית | `npm run dev` (מתוך `platform/`) |
| URL מקומי | http://localhost:3000 |
| Deployment | Vercel |
| **חשוב:** | ב-Vercel, root directory חייב להיות `platform` |

---

## 6. ארכיטקטורה

```
UI Components
     ↓
Feature Components (features/*/components/)
     ↓
Zustand Stores (store/*.store.ts)
     ↓
Repositories (lib/repositories/*.ts)
     ↓
Dexie/IndexedDB (lib/db.ts)
```

**כללים קשיחים:**
- UI לא ניגש ל-DB ישירות — רק דרך store
- Stores קוראים ל-repositories בלבד
- Repositories מנהלים את ה-persistence
- Dexie הוא source of truth
- הנתונים מקומיים לדפדפן — אין sync בין מכשירים
- אין backend כרגע

---

## 7. קבצי תיעוד קיימים ב-`platform/`

| קובץ | תוכן |
|------|------|
| `MEMORY.md` | קובץ זה — זיכרון מלא לשחזור סשן |
| `DEPLOYMENT_REPORT.md` | דוח פריסה, auth boundary, CLI path, checklist |
| `GOVERNANCE_MODEL_PROPOSAL.md` | הצעת מודל ממשל ראשונית |
| `GOVERNANCE_IMPLEMENTATION_REPORT.md` | דוח מימוש ממשל — Execution Context + Doc Health |
| `HEBREW_LOCALIZATION_PLAN.md` | תכנית לוקליזציה עברית מלאה — טבלאות תרגום, אסטרטגיית RTL |
| `PROJECTS_KANBAN_PLAN.md` | תכנית עיצוב Kanban לפרויקטים |
| `COMMAND_CENTER_PLAN.md` | תכנית Command Center לפורטפוליו |
| `PORTFOLIO_CONTROL_TOWER_PLAN.md` | תכנית Control Tower |
| `RELEASE_NOTES_v1.md` | הערות גרסה v1 |
| `PROJECT_STRUCTURE.md` | מבנה קבצים של האפליקציה |
| `README.md` | תיאור כללי |

**קבצים שתוכננו אך טרם נוצרו:**
- `PROJECT_HANDOFF.md` — יש ליצור
- `PROJECT_STATUS.md` — יש ליצור
- `IMPLEMENTATION_BLUEPRINT.md` — יש ליצור
- `WORKFLOW_GOVERNANCE_PROPOSAL.md` — יש ליצור לפני מימוש ממשל תהליך

---

## 8. מודל נתונים נוכחי

### Project
```typescript
id, name, description, status, priority, domain, goal,
next_action, current_phase, blocked_reason, project_type,
assigned_gpt, primary_workspace, repository_url, github_project_name,
local_folder_path, production_url, lovable_url, vercel_url,
current_execution_path, created_at, updated_at
```

**סטטוסים:** idea | scoped | active | blocked | completed | deferred | archived

**עדיפויות:** critical | high | medium | low | unset

**תחומים:** personal | work | general

**סוגי פרויקט:** software | ai_agent | automation | operations | research | personal | infrastructure

### Task
```typescript
id, title, notes, status, priority, blocked_reason, project_id, created_at, updated_at
```
**סטטוסים:** todo | in_progress | done | blocked

### AI Asset
```typescript
id, name, type, description, project_id, url, notes, created_at, updated_at
```

### Decision
```typescript
id, title, body, context, outcome, project_id, decided_at, created_at, updated_at
```

### KnowledgeItem
```typescript
id, title, body, item_type, doc_role, doc_status, source_url, project_id, created_at, updated_at
```
**סוגי פריט:** note | reference | learning | process | research

---

## 9. כיוון UI נוכחי

- **עברית ראשית** — כל הממשק עברית, RTL מלא
- **Sidebar בצד ימין** — `dir="rtl"` מסדר את זה אוטומטית עם logical properties
- **פרויקטים = Kanban פורטפוליו** — עמודות לפי סטטוס, priority borders בצבע, KPI strip בראש
- **קארדים קומפקטיים** — מידע רב בפחות גובה, ללא scroll פנימי בעמודות
- **עדיפות = ויזואלית** — `border-s-4` בצבע לפי עדיפות
- **scroll גלובלי** — גלילה ברמת הדף, לא scroll פנימי בעמודות
- **שטח sidebar** — מיועד להפוך לכלי תובנות פורטפוליו / command center

---

## 10. נקודות כאב נוכחיות (פידבק אחרון)

- **גופן לא מקובל** — צריך להחלפה (הפיצ'ר הבא האפשרי)
- **Kanban צפוף מדי** — צריך פחות צפיפות ויזואלית
- **הבדלי עדיפות לא מספיק ברורים** — ביטוי grid-level חזק יותר
- **scroll מקונן בעמודות גרוע** — scroll גלובלי עדיף
- **שטח sidebar ריק** — צריך להפוך לשימושי

---

## 11. הפיצ'ר הגדול הבא — ממשל תהליך עבודה

### מטרה
המערכת **מכריחה** את המשתמש לעבוד בצורה מסודרת. לא ניתן לדלג על שלבים.

### תהליך הכניסה לפרויקט

**שלב 1 — Draft (רעיון בלתי מאושר):**

הפרויקט נשאר ב-Draft עד שהשדות הבאים מולאו:
- שם הפרויקט
- מטרה
- קהל יעד
- סוג אחסון נתונים: מקומי / ענן / היברידי / לא רלוונטי
- פלטפורמה: web | mobile | desktop | automation | GPT only | אחר
- סוג פרויקט
- עדיפות
- סיבה עסקית/אישית
- פעולה הבאה

**שלב 2 — GPT Specification נוצר:**

לאחר מילוי כל השדות, המערכת מייצרת מסמך GPT Specification אוטומטי.

**שלב 3 — GPT Setup:**

המשתמש חייב ליצור GPT ייעודי ולהזין:
- שם ה-GPT
- קישור ל-GPT (אם קיים)
- תפקיד ה-GPT
- האם הועלו Knowledge files
- אילו Knowledge files הועלו

**שלב 4 — בדיקת מוכנות מסמכים:**

לפני שניתן להתחיל לפתח, הפרויקט חייב להכיל:
- GPT Specification (ב-KnowledgeItem עם doc_role = implementation_blueprint)
- Project Handoff (doc_role = handoff_document)
- Implementation Blueprint (doc_role = implementation_blueprint)

**Task types נוספים (על entity קיים):**

```typescript
task_type: 'task' | 'feature' | 'bug'
```

לא ליצור entity חדש אלא להוסיף שדה ל-Task הקיים.

### לפני מימוש

1. צור `WORKFLOW_GOVERNANCE_PROPOSAL.md` עם הצעה מפורטת
2. קבל אישור
3. מש בשלבים

---

## 12. הוראות לסשן הבא

**בתחילת כל סשן חדש:**

1. קרא `MEMORY.md` (קובץ זה) — שחזר הקשר מלא
2. הרץ `git log --oneline -5` — ראה מה בוצע לאחרונה
3. הרץ `npx tsc --noEmit` — וודא אין שגיאות TypeScript
4. סכם את המצב למשתמש ב-2–3 משפטים
5. המשך מהפיצ'ר הבא לפי סעיף 14

**אם המשתמש לא מבקש כלום ספציפי:**
התחל מ-"עבודה הבאה" לפי סעיף 14.

---

## 13. כללים קשיחים — אסור בהחלט

**לא להכניס ללא אישור מפורש:**

- Auth / users / sessions
- צוותים / הרשאות / שיתוף
- Billing / subscription / plans
- Cloud sync / real-time / WebSockets
- Multi-tenant architecture
- Workflow engine חיצוני (n8n, Temporal, וכו')
- Supabase / Firebase / external DB (ללא Approval Brief)
- Integrations חיצוניות (Slack, email, GitHub API live)
- Enterprise overhead מכל סוג

**כללי Approval Brief (מ-CLAUDE.md הגלובלי):**

לפני כל שינוי ב-Supabase auth, RLS, database schema, migrations, env vars, service_role keys, deployment config, security permissions, production data, או report snapshot — **עצור וכתוב Approval Brief.**

---

## 14. עבודה הבאה מתוכננת

### סדר עדיפויות

| # | משימה | מצב |
|---|-------|-----|
| 1 | Localization Pass #1 — Hebrew UI + RTL | **הושלם** ✓ |
| 2 | תיקון גופן — החלפה לגופן עברי מתאים | ממתין |
| 3 | שיפור Kanban — פחות צפיפות, scroll גלובלי | ממתין |
| 4 | `WORKFLOW_GOVERNANCE_PROPOSAL.md` — הצעת ממשל תהליך | ממתין |
| 5 | מימוש ממשל תהליך עבודה — Draft lifecycle, GPT setup, doc readiness | ממתין |

### הפיצ'ר הבא המיידי

**A.** תיקון גופן — הוספת גופן עברי (לדוג' Heebo, Assistant, או Rubik מ-Google Fonts)

**B.** לאחר מכן — `WORKFLOW_GOVERNANCE_PROPOSAL.md`

**C.** לאחר אישור — מימוש ממשל תהליך בשלבים

---

## 15. commit log — נקודות ציון עיקריות

```
3c4c2f4  feat: Localization Pass #1 — full Hebrew interface + RTL layout
6144b50  feat: governance data model — Execution Context + Documentation Health
7cd95ca  feat: UI Pass #4 — Portfolio Command Center
2719162  docs: update deployment report — auth boundary, CLI path, post-deploy checklist
34bd2df  feat: Portfolio Control Tower — priority borders, KPI strip, density, empty collapse
fb8f1b2  feat: redesign Projects as portfolio Kanban board
```

---

---

## 16. Latest Session Summary — Hebrew Content / Usage Stop Point

### Current Project State

The AI Project Management Platform is operational and deployed.

The system now includes:
- Hebrew UI
- RTL support
- Heebo typography
- Portfolio Kanban
- Workflow Governance across all 7 phases
- Project lifecycle validation
- GPT Specification flow
- GPT setup tracking
- Knowledge readiness enforcement
- Task / Feature / Bug model
- Local-first Dexie/IndexedDB persistence
- GitHub repository
- Vercel deployment
- Import/export
- Dashboard, Projects, Tasks, AI Assets, Decisions, Knowledge, Settings, Command palette/search

### Important Latest Issue — Hebrew Content in Browser

The UI was translated, but visible project content appeared in English because the browser was showing stale Dexie/IndexedDB data from an older import.

**Root cause:**
- Runtime UI reads from Dexie only. seed.ts is used only when importing projects manually from Settings. The Excel file is not read at runtime.
- Existing browser data must be cleared and re-imported to reflect updated Hebrew seed content.

**Code path (confirmed):**
```
UI → useProjectsStore.load() → ProjectsRepository.findAll() → db.projects (Dexie) only
seed.ts → only consumed by Settings → handleImportSeed()
```

**User action already taken:**
- User deleted existing browser data.
- Next step: re-import 27 projects from Settings and verify Hebrew content.

### Verification Needed Next Session

1. Open deployed app
2. Go to Settings / הגדרות
3. Click import 27 projects / ייבא 27 פרויקטים
4. Check sample projects and confirm Hebrew content:

| Project | Goal (expected) |
|---------|----------------|
| פלטפורמת ניהול למידת AI | למידת AI מובנית לכל המשפחה |
| אפליקציית הזדמנויות תעסוקה | אוטומציה של סריקת שוק העבודה עבור שני פרופילי קריירה |
| סוכן כתיבת אפליקציות | אוטומציה של כתיבת קוד תשתית לאפליקציות לקיצור זמן-עד-גרסה-ראשונה-עובדת ב-50% |

5. If English remains after re-import — inspect `data/seed.ts` and the Settings import path again.

**Note:** "Family Flow" does not exist in `data/seed.ts` under any name. If it appears in the browser, it was created manually in Dexie. It will not appear after a clean reseed.

### Important Rule

Do not continue feature development until Hebrew content import is verified.

### Current Product Decision — 30-Day Usage Mode

Development stops after Hebrew content verification. Platform enters Usage Mode.

**Usage Mode means:**
- No new features
- No new entities
- No architecture changes
- Use the platform daily
- Track friction points in real use

**Potential future improvements — only after real usage confirms them:**
- Faster inline creation of decisions/knowledge from project context
- Project staleness indicators (last updated X days ago)
- Simplified Kanban if lifecycle columns are too heavy for mixed portfolios
- Better GPT management linked to AI Assets (currently disconnected)
- "Today's one thing" dashboard synthesis

### Validation Artifacts Created This Session

| File | Purpose |
|------|---------|
| `VERIFICATION_REPORT.md` | Data source trace, extracted seed values, English content scan results |
| `scripts/validate-seed.mts` | Runnable tsx script: `npx tsx scripts/validate-seed.mts` — extracts seed values and scans for English |
| `CONTENT_LOCALIZATION_REPORT.md` | Field-by-field audit of all 23 projects in seed.ts |

---

*עודכן לאחרונה: 2026-06-06 | סשן: Hebrew Content Verification + Usage Mode*
