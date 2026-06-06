# Content Localization Report
**Date:** 2026-06-06  
**File audited:** `data/seed.ts`  
**Projects audited:** 23

---

## Summary

The seed portfolio was already substantially localized in a prior session. This pass performed a complete field-by-field audit of every project and found **one remaining English word** in a translatable content field.

**Change made:**  
`data/seed.ts` line 55 — `סוכן כתיבת אפליקציות` goal field:  
`'boilerplate'` → `'קוד תשתית'`

All other content was confirmed correct: Hebrew throughout, with technical identifiers, product names, URLs, GPT names, and standard tech acronyms preserved as specified.

---

## Localization Rules Applied

| Category | Rule | Examples kept |
|---|---|---|
| Product names | Keep as-is | Monday.com, WhatsApp, LinkedIn, AllJobs, Booking, Skyscanner, SolarEdge, Excel |
| GPT names | Keep as-is | Claude Sonnet 4.6 (Claude Code CLI) |
| URLs | Keep as-is | `https://github.com/...` |
| GitHub identifiers | Keep as-is | `arieldeitch/ai-project-management-platform` |
| Folder paths | Keep as-is | `C:/Users/user/Desktop/AI/ניהול פרויקטים/platform` |
| Version identifiers | Keep as-is | v1, v2+ |
| Medical acronyms | Keep as-is | OCD |
| Standard tech acronyms | Keep as-is | AI |
| Hebrew borrowings (natural Israeli usage) | Keep as-is | אד-הוק, סשן, פיצ'ר, קונקרטי, מיקסום, פרסונליזציה, אוטומציה |

---

## Projects Translated (All Content in Hebrew)

All 23 projects have Hebrew names, descriptions, goals, next actions, current phases, and blocked reasons. The following confirms each project's content status after this pass.

### Active Projects

| Project | Status | Notes |
|---|---|---|
| פלטפורמת ניהול פרויקטים | ✅ Hebrew | Technical fields (assigned_gpt, repository_url, github_project_name, local_folder_path, primary_workspace) kept as technical identifiers. "AI" and "Excel" in description kept as product name and standard acronym. |
| אפליקציית הרגלים אישיים | ✅ Hebrew | All content fields in Hebrew. |
| פורמט מפרט פרויקט | ✅ Hebrew | "סשנים" (sessions) and "פרומפטים" (prompts) are standard Israeli tech usage, kept. |

### Scoped Projects

| Project | Status | Notes |
|---|---|---|
| סוכן כתיבת אפליקציות | ✅ Hebrew | **Fixed:** `boilerplate` → `קוד תשתית` in goal. "v1" kept as version identifier. "סטנדרטי" is a natural Hebrew borrowing, kept. |
| פלטפורמת ניהול חומרים | ✅ Hebrew | "סווטה" is a personal name, kept. "מייל" is the standard Hebrew word for email. |

### Blocked Projects

| Project | Status | Notes |
|---|---|---|
| אפליקציית החזרות הודו | ✅ Hebrew | All content in Hebrew. |
| פלטפורמת דיווח שבועי | ✅ Hebrew | "זביקה" is a personal name, kept. |
| אפליקציית ניהול משימות הבית | ✅ Hebrew | "v1" kept as version identifier. "תום" and "רוני" are personal names, kept. |

### Draft Projects

| Project | Status | Notes |
|---|---|---|
| פלטפורמת תפעול זביקה | ✅ Hebrew | "Monday.com" is a product name, kept. "אד-הוק" is natural Israeli business Hebrew. |
| חלופה ל-Monday.com | ✅ Hebrew | "Monday.com" in name and description is a product name, kept intentionally. |
| ניהול משימות משותף הודו | ✅ Hebrew | "WhatsApp" is a product name, kept. |
| כלי הזמנות אריזה הודו | ✅ Hebrew | All content in Hebrew. |
| סוכן בדיקות אפליקציות | ✅ Hebrew | All content in Hebrew. |
| אפליקציית אופטימיזציית הוצאות | ✅ Hebrew | "SolarEdge" is a product name, kept. "AI" kept. "קונקרטי" is natural Israeli Hebrew. |
| פלטפורמת אופטימיזציית טיולים | ✅ Hebrew | "Booking", "Skyscanner" are product names, kept. "v2+" kept as version identifier. "פרסונליזציה" is natural Israeli tech usage. |
| אפליקציית הזדמנויות תעסוקה | ✅ Hebrew | "LinkedIn", "AllJobs" are product names, kept. "אלנה" is a personal name, kept. |
| פלטפורמת ניהול למידת AI | ✅ Hebrew | "AI" kept as standard acronym (also part of the platform category name). |
| אפליקציית ניהול קניות | ✅ Hebrew | All content in Hebrew. |
| אפליקציית תמיכה OCD | ✅ Hebrew | "OCD" is a medical acronym kept in both name and description — widely understood in Israeli healthcare contexts. |
| אפליקציית פיתוח אישי של תום | ✅ Hebrew | "תום" is a personal name, kept. |
| אפליקציית פיתוח אישי של רוני | ✅ Hebrew | "רוני" is a personal name, kept. |

### Completed Projects

| Project | Status | Notes |
|---|---|---|
| אפליקציית אימון של תום | ✅ Hebrew | All content in Hebrew. |
| אפליקציית אימון של רוני | ✅ Hebrew | All content in Hebrew. |

### Archived Projects

| Project | Status | Notes |
|---|---|---|
| פלטפורמת ניהול הוצאות | ✅ Hebrew | Archive note in Hebrew. |
| אפליקציית טיולים וחופשות | ✅ Hebrew | "Booking/Skyscanner" are product names, kept. Archive note in Hebrew. |
| פלטפורמת החזר הוצאות נסיעה | ✅ Hebrew | "פיצ'ר" is standard Israeli tech Hebrew, kept. Archive note in Hebrew. |
| פלטפורמת ניהול פרויקטי פיתוח | ✅ Hebrew | "Monday.com" is a product name, kept. Archive note in Hebrew. |

---

## Projects Intentionally Left with English Elements

No project names were left in English. The following **English strings within Hebrew content** were intentionally preserved per localization rules:

| String | Location | Reason |
|---|---|---|
| `Claude Sonnet 4.6 (Claude Code CLI)` | פלטפורמת ניהול פרויקטים — assigned_gpt | GPT name |
| `Claude Code CLI` | פלטפורמת ניהול פרויקטים — primary_workspace | Technical identifier |
| `https://github.com/arieldeitch/...` | פלטפורמת ניהול פרויקטים — repository_url | URL |
| `arieldeitch/ai-project-management-platform` | פלטפורמת ניהול פרויקטים — github_project_name | GitHub identifier |
| `C:/Users/user/Desktop/AI/ניהול פרויקטים/platform` | פלטפורמת ניהול פרויקטים — local_folder_path | Folder path |
| `Excel` | פלטפורמת ניהול פרויקטים — description | Product name |
| `AI` | Multiple projects — descriptions and goals | Standard tech acronym, widely used in Israeli Hebrew |
| `Monday.com` | פלטפורמת תפעול זביקה, חלופה ל-Monday.com, פלטפורמת ניהול פרויקטי פיתוח | Product name |
| `WhatsApp` | ניהול משימות משותף הודו — goal | Product name |
| `LinkedIn, AllJobs` | אפליקציית הזדמנויות תעסוקה — description | Product names |
| `Booking, Skyscanner` | פלטפורמת אופטימיזציית טיולים, אפליקציית טיולים וחופשות | Product names |
| `SolarEdge` | אפליקציית אופטימיזציית הוצאות — description | Product name |
| `OCD` | אפליקציית תמיכה OCD — name and description | Medical acronym |
| `v1`, `v2+` | סוכן כתיבת אפליקציות, אפליקציית ניהול משימות הבית, פלטפורמת אופטימיזציית טיולים | Version identifiers |

---

## Build Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✓ 0 errors |
| `npx next build` | ✓ 21 routes, 0 warnings |
