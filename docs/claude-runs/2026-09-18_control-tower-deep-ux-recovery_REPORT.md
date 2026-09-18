# Run Report — Control Tower Android 0.6 Deep UX / Information Architecture Recovery

**Task:** `docs/claude-tasks/2026-09-18_control-tower-deep-ux-recovery.md` (+ one-pager)
**Run end (Asia/Jerusalem):** 2026-09-18 16:25 IDT
**Circuit breaker:** one implementation pass, **one real UX review on an emulator**, one remediation pass. Respected.

## Identity

| | Value |
|---|---|
| Start | branch `control-tower-apk-build` @ `3497140` (0.5.0, light theme) |
| Code commits | `fe57902` (0.6.0 recovery), `83c2add` (secret-scan comment fix) |
| **Artifact commit** | **`83c2add09cb65af457b768140b387a9a598fe0d1`** |
| **GitHub Actions run** | **35348997258** (all steps green) |
| **APK artifact** | **`ControlTower-0.6.0-debug`** → `ControlTower-0.6.0-debug.apk`, 2,614,028 bytes, SHA-256 `c21bd8450caa23db5d88e914ec74db8a3520794df0cf7d18a426a765c08baa06` |
| Version | `versionName 0.6.0`, `versionCode 7`, package `com.ariel.controltower` (unchanged) |
| Final commit (docs) | see `git log -1` on the branch after this report was committed |

## Gates

- **Engineering: 🟢 GREEN** — build, unit tests 12/12, gateway tests 8/8, lint 0 errors (18 warnings, all pre-existing style classes), secret scan clean, artifact produced, new timestamp fields mapped and tested, canonical coverage documented and enforced in code, Hebrew status on all core screens, time wall on Home/Projects/Detail, dark-soft system applied everywhere, navigation unambiguous.
- **Product: 🟡 AMBER — 🧪 מחכה לאריאל — USER TEST REQUIRED.** Emulator review passed; physical-device acceptance by Ariel is still required. Not GREEN from compilation.

## Requirements Integrity Guard (intent → requirement → evidence → outcome)

| # | Ariel's intent | Requirement (task §) | Implementation evidence | User-visible outcome |
|---|---|---|---|---|
| 1 | Light theme is worse; dark but softer | §6 palette | `Theme.java` (#171C24 bg, #202733 nav, #252D39 surface, #B5BFCC muted, #7BA8E8 accent…), `styles.xml`/`colors.xml`, all screens on one theme | Charcoal/slate surfaces, no near-black, status colours legible without neon (screenshots `home.png`, `activity.png`) |
| 2 | Status in Hebrew, not enums | §5 | `model/Hebrew.java` (rag, ragMeaning, lifecycle, confidence, inbox status/source, push events, freshness) + tests `ragIsHebrewWithMeaning`, `lifecycleAndConfidenceAreHebrew` | "אדום · דורש טיפול", "צהוב · במעקב", "ירוק · תקין", "מחכה לבדיקה שלך", "גבוהה/בינונית/נמוכה", "צריך אותך" — no raw enum on Home/Projects/Detail |
| 3 | When did real project activity happen | §3 data semantics | Gateway v2: `last_meaningful_progress` (Last Meaningful Progress) vs `last_control_check` (Last Control Check), `expected_cadence`; `Project.java` keeps them apart; test `projectActivityIsDistinctFromControlCheck`, gateway test "distinct progress vs control-check timestamps" | Card/detail show project activity; Control Tower check only under "נתוני בקרה" |
| 4 | Strong per-project time wall | §4 | `MainActivity.timeWall()` (label, 18–24sp `DD/MM/YYYY HH:MM`, relative age, freshness chip, stale/unknown sentence); `TimeText` + tests `absoluteTimestampIsIsraelFormat`, `relativeAgeInHebrew` | Every card and the detail header show "פעילות אחרונה בפרויקט · 02/09/2026 16:03 · לפני שבועיים · ישן · המידע ישן ביחס לקצב הצפוי (כל 3 ימים)" |
| 5 | App-level snapshot freshness | §4 Home | `snapshotLine()` from `Portfolio.syncedAt`; cached snapshot + amber warning on refresh failure | "עודכן לאחרונה: 18/09/2026 16:10 · עכשיו" at the top of Home/Projects/Activity |
| 6 | Home useful in <10 s | §7 Home | header → counts strip → "צריך אותי עכשיו" → rest | `home.png`: 6 projects, 3 waiting for me, red/watch/green/stale counts, portfolio last activity, then the three actionable cards |
| 7 | Needs-Ariel / RED / stale first | §7, §9 | `Project.urgencyScore()` + `Portfolio.URGENCY`; test `urgencyOrderingPutsNeedsArielRedAndStaleFirst` | Order: needs Ariel → user test → red → stale → aging → recency; unknown activity sinks |
| 8 | Cards useful, no raw metadata | §8 | cards: name, Hebrew badge, reason chips, status sentence, "מה צריך ממך"/"הבא:", time wall, "לפרטים" | No SHA/version/PROJECT_CONTROL_BOARD copy on Home; those live in Activity |
| 9 | Obvious navigation, never lost | §7 nav | bottom nav with filled active pill, "בית" link on secondary tabs, `onBackPressed`: detail → list → Home → exit; `android:supportsRtl` fixed so the nav order is RTL-correct | `deputy.png`, `activity.png` |
| 10 | Chief of Staff coverage | §2, §10 | `docs/control-tower/PORTFOLIO_RECONCILIATION_2026-09-18.md`; gateway `role=infrastructure`; tests `canonicalSixProjectsAreAllPresentAndInfrastructureIsSeparate`, "classifies a Control Tower row as infrastructure" | All six canonical projects render; Ariel Life OS cannot be omitted; Control Tower never counted as a child project |
| 11 | Visual RTL review | §12 | Pixel 7 / API 35 emulator (WHPX) with a fixture gateway; 6 screenshots committed | Found and fixed 3 structural defects (below) |
| 12 | Not GREEN from compile | §15 | Product gate AMBER | — |

## What changed in UX terms

**Before (0.5.0):** light theme; Home listed cards with English enum badges ("RED"), a single ambiguous "last check" buried in a dialog, no snapshot freshness, an `AlertDialog` as project detail, `⌂ חזרה לבית` buttons duplicating the nav, and — discovered during the emulator review — every horizontal row was actually laid out **left-to-right** because `android:supportsRtl` was never declared (name on the left, badge on the right, nav reversed).

**After (0.6.0):**
- Home opens with "מגדל הפיקוח", the snapshot time ("עודכן לאחרונה … · עכשיו"), a refresh button, and a five-number strip: צריך אותך / אדום / במעקב / תקין / ישן, plus "פעילות אחרונה בפורטפוליו" and how many projects lack an activity timestamp.
- "צריך אותי עכשיו (N)" lists only actionable projects; each card says why (chips: צריך אותך / מחכה לבדיקה שלך / המידע ישן), what it is about, **what Ariel must do** ("מה צריך ממך"), and the time wall.
- Every project card has the time wall: big Israel-format date, Hebrew relative age, freshness chip (עדכני / מתיישן / ישן / לא ידוע) and a plain sentence when stale ("המידע ישן ביחס לקצב הצפוי (כל 3 ימים)") or unknown ("אין חותמת פעילות עדכנית").
- Project detail is a full screen with the time wall on top and answers, in order: מה צריך ממך, מה המטרה, מה המצב עכשיו, מה קרה לאחרונה, הפעולה הבאה, מה חוסם, רמת ביטחון, סיכון; Control Tower's last check, cadence and board id sit in a muted "נתוני בקרה" card; primary link button; "חזרה לרשימה".
- Projects tab groups "מחכה לך / דורש טיפול" then "במעקב ותקין"; infrastructure rows (if any) appear under "תשתית (לא פרויקט)".
- Activity tab shows real project names instead of lowercase keys, Hebrew event labels, the snapshot line, and a warning if the deployed gateway is still contract v1.
- Deputy/inbox hide the `EXTERNAL_PROJECT_REPORT_V1` marker (shown as a "דוח חיצוני" chip instead).
- Offline/failed refresh: the last snapshot renders immediately with "מוצג עותק שמור מהמכשיר — הרענון האחרון נכשל" instead of an empty error.
- Android 15 edge-to-edge handled: content no longer sits under the status bar; the nav bar extends under the gesture area.

## Emulator review (real, not simulated)

Environment: Android SDK + Pixel_7 AVD (API 35, x86_64, WHPX) present on this machine; app built with an explicit **review flag** (`CT_REVIEW_GATEWAY_URL`, off in CI, cleartext stays disabled in normal builds) against `control-tower-android/tools/review-gateway.mjs`, a fixture gateway that serves the six canonical project names with fixture values and labels itself "(fixture)". Fixture data was used only to render screens; nothing fixture-based ships.

Review questions → answers (after remediation): all projects identifiable at a glance — yes (6, named, ordered); most important info above the fold — yes; time wall impossible to miss — yes; all operational status Hebrew — yes; technical leakage on main UX — none (diagnostics confined to Activity); Chief of Staff coverage reconciled — yes (doc + code); can always get Home — yes (nav, link, Back); palette pleasant rather than oppressive — yes (charcoal, soft borders, tinted chips).

Defects found by the review and fixed in the single remediation pass:
1. `android:supportsRtl` missing → all horizontal rows LTR (pre-existing since 0.3). Fixed; screenshot `before-remediation-home-ltr-bug.png` kept as evidence.
2. Content under the status bar (Android 15 edge-to-edge). Fixed with inset handling.
3. Timestamps flipped inside Hebrew sentences ("16:06 18/09/2026"). Fixed with Unicode isolates.
4. Home title lost after refresh (render cleared the header). Fixed with a content container.
5. Duplicate RAG chip; Activity tab showing a false "cached copy" warning and lowercase keys; raw "weekly" in the cadence line; machine marker in the inbox; duplicated "צריך את אריאל" in detail. All fixed.

Screenshots (committed): `docs/claude-runs/screenshots/2026-09-18_control-tower-0.6/{home,projects,project-detail,activity,deputy,before-remediation-home-ltr-bug}.png`.

## Chief of Staff coverage — summary of the reconciliation

Full table in `docs/control-tower/PORTFOLIO_RECONCILIATION_2026-09-18.md`. Board (canonical): Ariel Life OS, Household OS, Personal News Radar, Tom AI Learning, Nutrition App, Chief of Staff. CoS fixture: adds **AI Control Tower** (infrastructure, not a child project) and **News Agent** (naming drift of Personal News Radar), omits **Ariel Life OS**. Actions in this repo: gateway `role=infrastructure` for Control Tower rows; Android never filters by any fixture and renders every `project` row; tests pin the six names and the infrastructure classification. No rows invented. The CoS fixture itself is out of scope (CoS repo) and is recorded as a follow-up owned there. "OS Project Registry": no artefact exists in either repo — UNKNOWN.

## Verification evidence

| Check | Where | Result |
|---|---|---|
| Secret scan (private keys, service-account JSON, service_role, token-shaped literals) | CI step "Secret scan" | clean (it correctly caught and I removed a token-shaped example in a comment, run 35348872061) |
| Gateway mapping tests + CombinedCode sync | CI "Gateway tests" · `node --test` | 8/8 pass; `CombinedCode.gs is up to date` |
| Android unit tests (Hebrew mapping, time format, relative age, freshness/cadence, urgency order, canonical count, v1 fallback) | CI "Unit tests (presentation model)" + local | 12/12 pass |
| `assembleDebug` | CI + local (JDK 17, Gradle 9.3.1, AGP 8.7.3) | BUILD SUCCESSFUL |
| Lint | CI (non-blocking) + local | 0 errors, 18 warnings (SetTextI18n, RtlHardcoded in ShareReport, ObsoleteSdkInt folder, OldTargetApi, GradleDependency…) |
| Manifest of the shipped build | `aapt dump` | `supportsRtl=true`, `usesCleartextTraffic=false`, versionName 0.6.0 |
| Emulator screens | Pixel_7 API 35 | reviewed and remediated (above) |
| Physical device | — | NOT VERIFIED (Ariel) |

## Files materially changed

- Gateway: `Config.gs` (timestamp/cadence/evidence aliases, infrastructure patterns, contract version), `Portfolio.gs` (v2 mapper, realm-safe date parsing, role), `Code.gs` (0.6.0, `snapshot_at`, `contract_version`), `CombinedCode.gs` (regenerated), `build-combined.mjs` (new generator + `--check`), `test/portfolio.test.mjs` (new), `README.md`.
- Android: `Theme.java`, `Insets.java`, `model/{TimeText,Hebrew,Freshness,Project,Portfolio}.java` (new), `MainActivity.java` (rebuilt), `ShareReportActivity.java` (theme/copy), `Gateway.java` (review-URL guard), `AndroidManifest.xml` (`supportsRtl`, cleartext placeholder), `build.gradle` (0.6.0/7, test deps, review switch), `res/values*/{styles,colors}.xml`, `app/src/test/.../PortfolioModelTest.java` (new), `tools/review-gateway.mjs` (new).
- CI: `.github/workflows/control-tower-apk.yml` (Node setup, secret scan, gateway tests, unit tests, report upload).
- Docs: this report, `docs/control-tower/PORTFOLIO_RECONCILIATION_2026-09-18.md`, `docs/control-tower/RELEASE_STATUS.md`, screenshots.

## Preserved (checked)

Drive-first architecture; token security model (no token in Git, `CT_GATEWAY_TOKEN` still absent from repo secrets and not required — on-device entry remains); Firebase client plumbing and tracked `google-services.json` policy; share intake; deputy; activity; push registration; package id. No Supabase. No auth-model change.

## Residual risk

- The live board's exact header text is still not visible from this session; the aliases cover "Last Meaningful Progress", "Last Control Check", "Expected Cadence" and Hebrew variants, and `health.unresolved_columns` + `PROJECTS_COLUMN_MAP` remain the safety net.
- Until the gateway is redeployed, the app runs on contract v1: every project shows "אין חותמת פעילות עדכנית" (honest, not wrong) and the Activity tab flags the old gateway.
- Lint `GradleDependency` still notes a newer Firebase BoM; pinned on purpose.

## Remaining manual action for Ariel (minimum)

1. **Redeploy the gateway once** so the time wall gets real data: open the sheet → Extensions → Apps Script → replace `Code.gs` content with the repo's `google-apps-script/control-tower-gateway/CombinedCode.gs` → Deploy → Manage deployments → ✎ → *New version* → Deploy. (≈ 3 minutes; URL and token stay the same.)
2. Install `ControlTower-0.6.0-debug.apk` from run 35348997258 (or the next `workflow_dispatch`), open it, enter the token once if the build has none, and judge on the phone: is it clear, pleasant and useful. That judgement flips Product from AMBER to GREEN.
