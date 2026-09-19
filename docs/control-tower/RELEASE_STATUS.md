# Control Tower Android — release status

**Current candidate:** 0.10.0 (versionCode 11) · branch `control-tower-apk-build` · code commit `b46d8d2`
**Artifact of record:** GitHub Actions run 35435862836 → **`ControlTower-0.10.0-release`** (artifact 10581904689, `ControlTower-0.10.0-release.apk`, 1,942,274 bytes, SHA-256 `c94f0120e7579bfd0a317da92395d0de0367b41b7f54ff17a1d1e02463349fbe`, signed with the persistent key, cert SHA-256 `00151c98…7c7950` — verified locally with apksigner on the downloaded artifact). Installs **over** 0.7.0 / 0.9.0 with data kept. A debug artifact (`ControlTower-0.10.0-debug`, 10582189566) is for review only.
**Engineering gate:** 🟢 GREEN — build, signed release verified, 39/39 Android unit tests (21 new), 40/40 gateway tests, lint 0 errors, secret scan clean, CombinedCode in sync, emulator review + one remediation pass (screenshots `docs/claude-runs/screenshots/2026-09-19_control-tower-0.10/`).
**Product gate:** 🟡 AMBER — 🧪 מחכה לאריאל — USER TEST REQUIRED (physical-device acceptance pending).

## What 0.10.0 adds over 0.9.0
- **Home is compact and filterable.** Status chips (צריך אותך / חסום / דורש טיפול / במעקב / תקין) are real filters with counts, one-tap clear and a ⓘ legend that states each status's meaning and rule; "ישן" and "לא מיושר ל-OS" are extra filters. Rows: name — short description · status + why · activity time · OS chip.
- **Status is deterministic** (gateway `status_bucket` + Hebrew `status_reason`; the same rule runs on the client for older gateways).
- **OS alignment is a first-class fact:** CURRENT / VERSION_DRIFT / NEVER_SEEN / ACCESS_FAILED / UNKNOWN from the board's OS columns, evidence link, sync action; never derived from commits or checks. Five clocks stay separate.
- **Ideas:** three planning buckets (עכשיו / הבא / בהמשך) backed by the sheet's `planning_bucket` / `manual_order`; drag & drop (long-press) and ▲▼; optimistic local reorder with background `reorder_ideas`; collapsed add form; calmer palette.
- **סגן (Deputy):** repeated technical events are merged per functional problem and phrased as problem → why it matters → next → owner; raw evidence only under "ראיות".
- **פעילות:** installed build vs newest CI build (version, versionCode, short commit, branch, build time) — three honest outcomes (newer available / same / device ahead of CI).

## Gateway deployment state (VERIFIED 2026-09-19 ~12:55 IDT, token-free probe)
Repo gateway: **0.10.0 / contract 5** (`033a000`) — OS alignment columns + receipts (`os_receipt`), status taxonomy, short description, ideas `planning_bucket`/`manual_order` + `reorder_ideas`, header-name column resolution for Ideas.
Deployed Web App: **0.9.0 / contract 4** (Ariel deployed 0.9.0 since the last report). Until the one redeploy in `GATEWAY_DEPLOY_RUNBOOK.md`: the app works, but OS shows "לא ידוע" everywhere, status reasons are computed locally, idea buckets are all "בהמשך" and reorder shows "הסדר לא נשמר בלוח". Also set Script Property `OS_CURRENT_CHANGE_MARKER` (runbook).

## Push state
Unchanged from 0.7.0 (client registration VERIFIED on the emulator; server sending NOT VERIFIED — `FCM_SERVICE_ACCOUNT_JSON` not set).

## Minimum remaining Ariel action
1. Redeploy the gateway once (runbook, 3 min) and add `OS_CURRENT_CHANGE_MARKER`.
2. Install `ControlTower-0.10.0-release.apk` over the current build (no uninstall), use it for a day and say what is unclear.

## Evidence trail
- Run report: `docs/claude-runs/2026-09-19_control-tower-ux-os-chief-alignment_REPORT.md` (this release); previous: `…_control-tower-live-activity-pipeline_REPORT.md` (0.9.0), `…_8h-hardening_REPORT.md` (0.7.0)
- Emulator screenshots: `docs/claude-runs/screenshots/2026-09-19_control-tower-0.10/`
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

## Gateway deployment state (VERIFIED 2026-09-19 ~08:45 IDT, token-free probe)
Repo gateway: **0.9.0 / contract 4** (`56a0be3`) — live activity pipeline: ActivitySources → heartbeat/GitHub/Drive → ActivityLedger → effective `last_meaningful_progress` (evidence priority heartbeat › run report › GitHub › Drive › curated; Last Control Check never; automation only where `include_automation=TRUE`), validated `activity_heartbeat`, scan health fields.
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
