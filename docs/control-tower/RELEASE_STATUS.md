# Control Tower Android — release status

**Current candidate:** 0.11.0 (versionCode 12) · branch `control-tower-apk-build` · code commit `3c46618`
**Artifact of record:** GitHub Actions run 35528322215 → **`ControlTower-0.11.0-release`** (artifact 10610158177, `ControlTower-0.11.0-release.apk`, 1,950,271 bytes, SHA-256 `8e4cfc9f…87cba4`)
**Signing:** persistent release key (cert SHA-256 `00151c98…7c7950`) — installs **over** 0.10.0 with data kept.
**Engineering gate:** 🟢 GREEN — build, 53/53 Android unit tests (14 new: human layer vs machine layer, label fit, error mapping, latency instrumentation), 40/40 gateway tests, lint 0 errors, secret scan clean, emulator review at 412 / 393 / 360 dp and font scale 1.3 + one remediation pass (`docs/claude-runs/screenshots/2026-09-20_control-tower-0.11/`).
**Product gate:** 🟡 AMBER — 🧪 מחכה לאריאל — USER TEST REQUIRED (physical-device acceptance pending).

## What 0.11.0 changes over 0.10.0 (night run 2026-09-20)
- **Two layers, one rule.** Ariel sees short management Hebrew only (statuses תקין / במעקב / דורש טיפול / חסום / צריך אותך, sync states מסונכרן / לא מסונכרן / טרם סונכרן / סנכרון נכשל / סנכרון לא אומת, errors like "החיבור למגדל הפיקוח נדחה — נדרשת ריצת תיקון ב-GPT/Claude"). Every raw fact (status_bucket, os_alignment enum, markers, evidence, clocks, gateway error codes, perf samples) is kept in `Project.raw` / `technicalLines()` and shown only under "פרטים טכניים" — nothing was removed from the gateway contract.
- **עכשיו vs פרויקטים are now different screens.** עכשיו = "מה דורש אותי עכשיו": only projects that need Ariel + a three-line תמונת מצב (portfolio / OS sync / deputy) that deep-links. פרויקטים = the whole portfolio grouped by status with filters and the ⓘ legend. Filters live only on פרויקטים.
- **Compact rows:** name, one-line purpose, one status chip, one human sentence only when not תקין, "עודכן לפני …", and a chip only for לא עודכן / OS needs action.
- **Nothing clips or wraps badly:** bottom nav = glyph + one-line label (≤ 8 chars each), chips and small buttons live in a wrapping `FlowLayout`, buttons are one-line with real padding; verified at 360 dp + font scale 1.3.
- **Taps are immediate:** every screen renders from memory (caches parsed once at start) and refreshes in the background; filters/expand/ideas re-render in place; three background workers instead of one queue (a slow GitHub/gateway call no longer blocks the next fetch). Measured tap → first frame on the emulator with a 2.5 s-slow gateway: tab switch 8–53 ms, open project 7–9 ms, expand 15–18 ms, ideas nudge 17 ms (persisted in the background). Cold start first render ≈ 140–210 ms.
- **מערכת** (was פעילות): version in human terms, connection + notifications in human terms, alerts sent, and one collapsed technical block (build identity, gateway health, push state, cache ages, perf medians, last technical errors).

## Previous: 0.10.0 over 0.9.0
- **Home is compact and filterable.** Status chips (צריך אותך / חסום / דורש טיפול / במעקב / תקין) are real filters with counts, one-tap clear and a ⓘ legend that states each status's meaning and rule; "ישן" and "לא מיושר ל-OS" are extra filters. Rows: name — short description · status + why · activity time · OS chip.
- **Status is deterministic** (gateway `status_bucket` + Hebrew `status_reason`; the same rule runs on the client for older gateways).
- **OS alignment is a first-class fact:** CURRENT / VERSION_DRIFT / NEVER_SEEN / ACCESS_FAILED / UNKNOWN from the board's OS columns, evidence link, sync action; never derived from commits or checks. Five clocks stay separate.
- **Ideas:** three planning buckets (עכשיו / הבא / בהמשך) backed by the sheet's `planning_bucket` / `manual_order`; drag & drop (long-press) and ▲▼; optimistic local reorder with background `reorder_ideas`; collapsed add form; calmer palette.
- **סגן (Deputy):** repeated technical events are merged per functional problem and phrased as problem → why it matters → next → owner; raw evidence only under "ראיות".
- **פעילות:** installed build vs newest CI build (version, versionCode, short commit, branch, build time) — three honest outcomes (newer available / same / device ahead of CI).

## Gateway deployment state (VERIFIED 2026-09-20, token-free probe)
Repo gateway: **0.10.0 / contract 5** (`033a000`) — OS alignment columns + receipts (`os_receipt`), status taxonomy, short description, ideas `planning_bucket`/`manual_order` + `reorder_ideas`, header-name column resolution for Ideas.
Deployed Web App: **0.10.0 / contract 5** — live and verified (`verify-deployment.mjs` exit 0). Script Properties set by Ariel: `OS_CURRENT_VERSION = 1.1.0`, `OS_CURRENT_CHANGE_MARKER = OS-2026-09-19-01`. No gateway action is pending.

## Push state
Unchanged from 0.7.0 (client registration VERIFIED on the emulator; server sending NOT VERIFIED — `FCM_SERVICE_ACCOUNT_JSON` not set).

## Minimum remaining Ariel action
1. Install `ControlTower-0.11.0-release.apk` over 0.10.0 (no uninstall), use it for a day and say what is still unclear or slow.

## Evidence trail
- Run report: `docs/claude-runs/2026-09-20_control-tower-night-ux-performance_REPORT.md` (this release); previous: `…_control-tower-ux-os-chief-alignment_REPORT.md` (0.10.0), `…_control-tower-live-activity-pipeline_REPORT.md` (0.9.0), `…_8h-hardening_REPORT.md` (0.7.0)
- Emulator screenshots: `docs/claude-runs/screenshots/2026-09-20_control-tower-0.11/` (0.10.0: `…/2026-09-19_control-tower-0.10/`)
- OS alignment protocol: `docs/control-tower/OS_ALIGNMENT_RECEIPT_PROTOCOL.md`

---

## Previous: 0.7.0 / 0.9.0 (kept for history)

## Architecture (unchanged)
PROJECT_CONTROL_BOARD Sheet → Apps Script gateway (contract v2) → Android · FCM = push transport only · no Supabase.

## What 0.7.0 adds over 0.6.0
- **Install-over updates from now on.** 0.7.0 is the first build signed with the persistent release key; every later release installs over it with data kept (verified on the emulator). Upgrading from any earlier build (0.3–0.6, ephemeral CI debug key) requires one uninstall — the last one. See `SIGNING_AND_UPDATES.md`.
- **Timestamps are robust to real board cells:** Date cells, ISO (any offset), `YYYY-MM-DD HH:mm`, `DD/MM/YYYY HH:mm`, and `VERIFIED 2026-09-17 08:07: …` (one status word then a timestamp). Prose is never a timestamp; raw text is kept and shown as "בלוח רשום: …".
- **Freshness is honest:** unreadable/blank cadence → "לא ידוע · קצב צפוי לא הוגדר בלוח" (never stale); exact boundaries fresh ≤ cadence < aging ≤ 2× < stale; wider cadence vocabulary.
- **Three times, never conflated:** card = project activity; detail adds Control Tower check; header = snapshot sync ("עודכן לאחרונה").
- Home: "הכי עדכני: <project> · time", split counts for "בלי חותמת פעילות" vs "בלי קצב צפוי מוגדר"; scroll position kept on refresh; no refetch within 45 s of a fresh snapshot (explicit refresh forces); FCM registration throttled to 24 h; long evidence collapsible in detail; TalkBack labels on nav/refresh; 44 dp link buttons.
- Gateway 0.7.0: Connections mapping fixed for the real headers (Platform / Verification Status / Evidence / Connector); every reply carries `contract_version`/`gateway_version` so `verify-deployment.mjs` can check the deployment without the token.
## Historical: gateway deployment state as of 2026-09-19 ~08:45 IDT (superseded — live is 0.10.0 / contract 5)
Repo gateway (history): 0.9.0 / contract 4 (`56a0be3`) introduced the live activity pipeline: ActivitySources → heartbeat/GitHub/Drive → ActivityLedger → effective `last_meaningful_progress` (evidence priority heartbeat › run report › GitHub › Drive › curated; Last Control Check never; automation only where `include_automation=TRUE`), validated `activity_heartbeat`, scan health fields.
Deployed Web App: still **0.7.0 / contract 2** → the phone's time wall still follows the curated cell until the one redeploy in `GATEWAY_DEPLOY_RUNBOOK.md`. **No app update is needed for the fix** (0.7.0 reads `last_meaningful_progress`). Four of five GitHub sources are private → `GITHUB_READ_TOKEN` Script Property required for them (`health.activity_github_token_configured`).
Optional newer app: `ControlTower-0.9.0-release` (run 35424223931, artifact 10578401736, SHA-256 `4304f483…998a0`, same signing cert) installs over 0.7.0 and adds live source labels + the idea incubator.

## Push state
Client: FCM token obtained on the emulator with the tracked `google-services.json` and registered through the gateway (VERIFIED). Server: `FCM_SERVICE_ACCOUNT_JSON` is not set in Script Properties (no authenticated Firebase tooling on the build machine; not created here by design) → sending is NOT VERIFIED. Push gate stays not-GREEN until a physical device receives a push.

## Minimum remaining Ariel action
1. Redeploy the gateway once (runbook, 3 min) — this unlocks the time wall on real data.
2. Uninstall the old build, install `ControlTower-0.7.0-release.apk`, enter the token once, use it for a day and say whether it is clear, pleasant and useful.
(Optional, when convenient: paste the Firebase service-account JSON into Script Property `FCM_SERVICE_ACCOUNT_JSON` to enable push; set `CT_GATEWAY_TOKEN` as a GitHub secret to skip the on-device token entry on future installs.)

## Evidence trail
- Run reports: `docs/claude-runs/2026-09-18_control-tower-8h-hardening_REPORT.md` (this release), `…_deep-ux-recovery_REPORT.md` (0.6)
- Emulator screenshots: `docs/claude-runs/screenshots/2026-09-18_control-tower-0.7/`
- Reconciliation: `docs/control-tower/PORTFOLIO_RECONCILIATION_2026-09-18.md` (facts unchanged in 0.7)
