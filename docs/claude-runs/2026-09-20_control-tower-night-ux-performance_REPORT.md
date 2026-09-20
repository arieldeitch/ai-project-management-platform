# Run report — Night run: Hebrew compact UX + responsiveness + navigation clarity (2026-09-20)

**Task:** `docs/claude-tasks/2026-09-20_control-tower-night-ux-performance.md` · **Executor:** Claude Code (Opus 5), autonomous overnight EXECUTION run
**Branch:** `control-tower-apk-build` · **START_HEAD:** `d13a894` (task file commit; the task's authored SHA `8ee32d2` was one commit behind HEAD) · **END_HEAD:** the docs commit containing this report (code commit `3c46618`)

## Status in one line
Control Tower 0.11.0 shows Ariel only short management Hebrew, answers every tap from memory (7–53 ms tap → first frame
even with a 2.5 s-slow gateway), separates "מה דורש אותי עכשיו" from "כל הפרויקטים", and clips nothing at 360 dp / 1.3×
font — while every structured fact stays intact behind "פרטים טכניים" and in the unchanged gateway contract that Chief
of Staff consumes (234/234 tests there). Product gate: **USER TEST REQUIRED** until Ariel installs 0.11.0.

## Exact user-facing changes
| Area | Before (0.10.0, as Ariel saw it) | After (0.11.0) |
|---|---|---|
| Bottom navigation | בית · פרויקטים · רעיונות · סגן · פעילות — text-only buttons with 16 dp inner padding; labels could wrap at narrow widths / large font | עכשיו · פרויקטים · רעיונות · סגן · מערכת — glyph above a one-line label that owns the tab's full width; every label ≤ 8 chars (asserted by test) |
| בית → **עכשיו** | Attention rows **and** all other rows **and** infrastructure, with filter chips, legend, a headline sentence | Only projects that need Ariel ("צריך אותי (N)") or a calm "✓ אין כרגע משהו שמחכה לך"; then a three-line **תמונת מצב** card (portfolio counts · OS sync · deputy open items), each line deep-linking; button "כל הפרויקטים ›" |
| **פרויקטים** | Same rows as Home, grouped, same filter bar | The whole portfolio grouped by status, filters (status counts, לא עודכן, לא מסונכרן) + ⓘ legend; filters re-render in place and keep scroll; filters live only here |
| Project row | Title + status chip, reason line always, "הבא:" line, activity line with absolute + relative time, freshness chip, OS chip with enum-ish label ("OS לא עדכני") | Name (1 line, ellipsized) + purpose (1 line) + status chip; **one** human sentence only when not תקין; "עודכן לפני יומיים"; chips only for לא עודכן and for OS states that need a run (מסונכרן/לא ידוע stay quiet) |
| Project detail | Time wall card with absolute stamps + source, status reason repeated, OS block open with raw markers ("OS-2026-09-17 · נוכחית: …"), "מזהה בלוח", cadence label | One card: מה צריך ממך / למה / הבא / OS sentence when actionable / "עודכן לפני …"; collapsed **עוד פרטים** (goal, milestone, latest evidence, blocker, risk, confidence, absolute times, freshness note); collapsed **סנכרון למערכת ההפעלה** (human sentence, last sync, next step, evidence button); collapsed **פרטים טכניים** (all raw fields, LTR monospace) |
| Statuses / OS states | תקין … צריך אותך (kept); OS: "מיושר ל-OS", "OS לא עדכני", "טרם בדק OS", "אין גישה ל-OS", "OS לא ידוע" | Statuses unchanged; OS: **מסונכרן / לא מסונכרן / טרם סונכרן / סנכרון נכשל / סנכרון לא אומת** with one-sentence meanings ("הפרויקט לא מסונכרן למערכת ההפעלה") and a human next step; Control Tower's own `os_sync_action` still wins when present |
| Errors | Gateway text such as "השער דחה את הטוקן. בדוק GATEWAY_TOKEN." / "השער החזיר דף במקום JSON…" | `UserMessage.human`: "החיבור למגדל הפיקוח נדחה — נדרשת ריצת תיקון ב-GPT/Claude", "מגדל הפיקוח לא ענה בזמן — ננסה שוב ברקע", "אין חיבור לרשת — המידע השמור מוצג" …; the technical text goes to `technical()` → מערכת › פרטים טכניים › last errors |
| רעיונות | Actions in a horizontal row (could overflow at 360 dp), ▲▼ square buttons, add form "+ רעיון" | Actions as wrapping chips ("→ הבא", "▲ למעלה", "▼ למטה", "קדם ל־…"), form "+ רעיון חדש"; optimistic reorder unchanged |
| סגן | Fetched on every open (spinner), technical tags | Rendered from cache immediately, refreshed in background; tags as wrapping chips; evidence still behind "ראיות (N)" |
| פעילות → **מערכת** | Version lines with commit/ref/build-time in the primary text; gateway line with contract vocabulary; push line naming FCM/MobileDevices | "מותקנת בטלפון: 0.11.0" + one verdict (יש גרסה חדשה / זו הגרסה העדכנית / גרסת פיתוח); "מחובר למגדל הפיקוח · 6 פרויקטים בלוח"; "התראות: פעילות/כבויות/בהכנה"; two chips; alerts sent; **פרטים טכניים** collapsed: build identity, latest CI build, gateway URL/version/contract/os/activity health, raw push state, cache ages, perf medians, last technical errors |
| Setup screen | "טוקן", "השער" | "קוד גישה", "כתובת החיבור" (one-time screen; still the only place that shows a URL) |

## Final IA decision: עכשיו vs פרויקטים (kept as two tabs, made different)
- Journey "app launch / what needs me now?" → **עכשיו**: nothing but the projects that need Ariel (needs_ariel, user test, red), each with the one sentence that says what to do, plus the three-line תמונת מצב. No filters, no groups, no infrastructure.
- Journey "show me all projects" → **פרויקטים**: every project grouped by status (+ תשתית), filters and the legend. Tapping a תמונת מצב line or "כל הפרויקטים ›" lands here with the right filter.
- Journey "open one project" → the same compact detail from either tab; "‹ חזרה" / system Back return to the tab you came from, at the same scroll position.
- Rationale: the two screens answer two different questions, so they were kept; the duplication (same rows + same filters on both) was removed, which is what made them confusing. Merging would have put the whole portfolio back in front of Ariel on launch.

## Performance: root causes found and fixed
| Root cause (0.10.0) | Effect | Fix (0.11.0) |
|---|---|---|
| `Executors.newSingleThreadExecutor()` for **all** I/O | The GitHub "latest build" probe (2 HTTPS calls) and any slow/stuck gateway call queued behind each other; a tab's background refresh could wait 10–45 s (timeouts 15 s connect / 30 s read) before even starting | Fixed pool of 3 workers; each dataset de-duplicates in-flight fetches |
| Cache re-parsed from SharedPreferences on every tab switch (`cachedPortfolio()` → JSON parse + TimeText parsing of every row) | Main-thread work on each tap | Caches parsed **once** at start (`loadCaches`); screens render from in-memory objects |
| סגן and פעילות had no cache: spinner + network on every open | Visible wait on every open | Inbox and alerts cached; rendered immediately, refreshed in background (45 s throttle) |
| Filter / legend taps called `selectTab()` → whole screen rebuilt, scroll reset, possible refetch | Jank + lost position | In-place re-render of the content column (`rerenderProjects`), scroll position kept per tab |
| No measurement | Could not prove anything | `Perf` (tap → next `onPreDraw`) with logcat sink + in-app report under מערכת › פרטים טכניים |

Measured on the Pixel 7 API 35 emulator against the fixture gateway with **`LATENCY_MS=2500`** (every gateway answer takes 2.5 s):

| interaction | 0.11.0 tap → first frame |
|---|---|
| cold start → first עכשיו frame | 138–208 ms (includes window + nav creation) |
| tab עכשיו → פרויקטים | 20–53 ms |
| open project detail | 7–9 ms |
| expand פרטים טכניים | 17–18 ms |
| tab רעיונות / expand idea | 27–30 ms / 7–16 ms |
| ideas ▼ nudge (optimistic, then `reorder_ideas` in background) | **17 ms**; the sheet showed the new order 2.5 s later |
| tab סגן / open command form | 10–20 ms / 9 ms |
| tab מערכת | 8 ms |

Before (0.10.0) there was no instrumentation; the structural causes above are what made taps wait for the network. All
local interactions are now well under the 100–150 ms target; network completion is decoupled and shown as "מתעדכן…".

## Label / layout audit
- Every `Labels` constant, every `Status`/`OsAlignment` label and meaning is asserted Hebrew, short and free of technical vocabulary (`HumanLayerTest`).
- Controls: bottom nav (glyph + 1-line label), title-row buttons (`linkButton`, wrap width, one line), full-width buttons (`actionButton`, one line, 48 dp), chips and small actions in `FlowLayout` (wrap, never clip), name/purpose ellipsized at one line.
- Verified on the emulator at **412 dp** (default), **393 dp** and **360 dp**, and at **font scale 1.3** (360 dp): screenshots `01`–`13` in `docs/claude-runs/screenshots/2026-09-20_control-tower-0.11/`.

## Review → remediation pass
1. Technical blocks (project detail, מערכת) rendered right-aligned inside RTL parents → `LAYOUT_DIRECTION_LTR` + `TEXT_ALIGNMENT_TEXT_START` (screenshot `12` after).
2. Ariel's confirmed pain points were re-checked after the fix: no clipped chip/button/nav label at any tested width; no English explanatory copy on any primary surface (project/product names and the setup URL excepted).

## Tests & gates
| gate | result |
|---|---|
| Android unit tests | **53 / 53** (`HumanLayerTest` 14 new: Hebrew/short labels, nav fit, error mapping, technical text preserved, human line rules, OS chip rules, machine layer survives, client-derived marker, deputy human layer, perf ring buffer/report) + `ControlTower010Test` 21 + `PortfolioModelTest` 18 |
| Android lint | 0 errors |
| Gateway tests | 40 / 40 (gateway untouched this run; CombinedCode in sync) |
| Secret scan | clean — no token/keystore material; the fixture token is a review string |
| Chief of Staff contract | gateway contract unchanged; CoS `bun test` **234 / 234** on current `main` (contract-5 consumer tests included) |
| APK CI | run **35528322215** on `3c46618` — see § Artifact |
| Emulator review | 13 screenshots, 3 widths, 2 font scales, one remediation pass |

## Downstream contract validation
- Nothing changed in `google-apps-script/` or in the JSON the app sends/receives. The simplification is presentation-only: `Project.raw` is the untouched gateway row, `technicalLines()` re-emits `status_bucket` (+ "(client-derived)" when the gateway did not send one), `status_reason`, `os_alignment`, markers, evidence, `os_sync_action`, both activity clocks, control check, cadence/freshness, evidence URL.
- Chief of Staff reads the gateway directly (not the app) and its suite passes unchanged.

## Deployed-state documentation (corrected)
Live gateway verified 2026-09-20 with the token-free probe: **0.10.0 / contract 5**; Script Properties `OS_CURRENT_VERSION = 1.1.0`, `OS_CURRENT_CHANGE_MARKER = OS-2026-09-19-01`. `RELEASE_STATUS.md`, `GATEWAY_DEPLOY_RUNBOOK.md` and `OS_ALIGNMENT_RECEIPT_PROTOCOL.md` no longer claim 0.9.0 / contract 4 or a pending redeploy.

## Artifact
| field | value |
|---|---|
| versionName / versionCode | **0.11.0 / 12** |
| commit | `3c46618` |
| workflow run | 35528322215 (`Control Tower APK`, branch `control-tower-apk-build`) |
| artifact | `ControlTower-0.11.0-release` — id and SHA-256: see the addendum at the end of this file |
| signing | persistent release key, cert SHA-256 `00151c98…7c7950` → installs over 0.10.0 without data loss (verified on the emulator: 0.10.0 → 0.11.0 update kept the cached portfolio/ideas/inbox) |
| Ariel must install | **yes** |

## Invariants
No auth/secrets/sharing/OAuth/RLS/approval changes · no gateway/contract change · no board cell edited · no force-push · concurrent commits on the branch pulled before work.

## Addendum — artifact of record (CI green)
- Workflow run **35528322215** ✅ on `3c46618`.
- **`ControlTower-0.11.0-release`** artifact id **10610158177** (`ControlTower-0.11.0-release.apk`, 1,950,271 bytes),
  SHA-256 **`8e4cfc9f552a609feb10d60d84e5669c13029e728bf624718f0ede39e787cba4`**, signer cert SHA-256
  `00151c986c8be1e3cd82bc345b5af84bbc41ca2e951125f47a070e229d7c7950` (verified locally with apksigner on the downloaded file).
- Update-over verified on the emulator with the **signed** builds: signed 0.10.0 installed → signed 0.11.0 `adb install -r` → `Success`, package reports versionCode 12 / 0.11.0 (same signer, so Android keeps app data).
- Debug artifact `ControlTower-0.11.0-debug` 10610462674 (review only); unit-test report 10610048186; lint report 10610033155.
