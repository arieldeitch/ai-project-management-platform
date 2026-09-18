# Control Tower Android — release status

**Current candidate:** 0.7.0 (versionCode 8) · branch `control-tower-apk-build` · code commit `e382166`
**Artifact of record:** GitHub Actions run 35356798804 → **`ControlTower-0.7.0-release`** (`ControlTower-0.7.0-release.apk`, 2,068,741 bytes, SHA-256 `ca8d6238…fb51f1`, signed with the persistent key, cert SHA-256 `00151c98…7c7950`). A debug artifact (`ControlTower-0.7.0-debug`) is also produced for review only.
**Engineering gate:** 🟢 GREEN — build, signed release verified (v2+v3), 15/15 Android unit tests, 12/12 gateway tests, lint 0 errors, secret scan clean, CombinedCode in sync.
**Product gate:** 🟡 AMBER — 🧪 מחכה לאריאל — USER TEST REQUIRED (physical-device acceptance pending).

## Architecture (unchanged)
PROJECT_CONTROL_BOARD Sheet → Apps Script gateway (contract v2) → Android · FCM = push transport only · no Supabase.

## What 0.7.0 adds over 0.6.0
- **Install-over updates from now on.** 0.7.0 is the first build signed with the persistent release key; every later release installs over it with data kept (verified on the emulator). Upgrading from any earlier build (0.3–0.6, ephemeral CI debug key) requires one uninstall — the last one. See `SIGNING_AND_UPDATES.md`.
- **Timestamps are robust to real board cells:** Date cells, ISO (any offset), `YYYY-MM-DD HH:mm`, `DD/MM/YYYY HH:mm`, and `VERIFIED 2026-09-17 08:07: …` (one status word then a timestamp). Prose is never a timestamp; raw text is kept and shown as "בלוח רשום: …".
- **Freshness is honest:** unreadable/blank cadence → "לא ידוע · קצב צפוי לא הוגדר בלוח" (never stale); exact boundaries fresh ≤ cadence < aging ≤ 2× < stale; wider cadence vocabulary.
- **Three times, never conflated:** card = project activity; detail adds Control Tower check; header = snapshot sync ("עודכן לאחרונה").
- Home: "הכי עדכני: <project> · time", split counts for "בלי חותמת פעילות" vs "בלי קצב צפוי מוגדר"; scroll position kept on refresh; no refetch within 45 s of a fresh snapshot (explicit refresh forces); FCM registration throttled to 24 h; long evidence collapsible in detail; TalkBack labels on nav/refresh; 44 dp link buttons.
- Gateway 0.7.0: Connections mapping fixed for the real headers (Platform / Verification Status / Evidence / Connector); every reply carries `contract_version`/`gateway_version` so `verify-deployment.mjs` can check the deployment without the token.

## Gateway deployment state (VERIFIED 2026-09-18 16:40 IDT, token-free probe)
The deployed Web App is still **contract v1**. The app works against it, but shows "אין חותמת פעילות עדכנית" for every project until the one manual redeploy in `GATEWAY_DEPLOY_RUNBOOK.md` is done (≈3 min, same URL/token).

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
