# Control Tower Android — release status

**Current candidate:** 0.6.0 (versionCode 7) · branch `control-tower-apk-build` · commit `83c2add`
**Artifact:** GitHub Actions run 35348997258 → `ControlTower-0.6.0-debug` (`ControlTower-0.6.0-debug.apk`, SHA-256 `c21bd845…baa06`)
**Engineering gate:** 🟢 GREEN (build, 12/12 unit tests, 8/8 gateway tests, lint 0 errors, secret scan clean)
**Product gate:** 🟡 AMBER — 🧪 מחכה לאריאל — USER TEST REQUIRED (physical-device acceptance pending)

## Architecture (unchanged)
PROJECT_CONTROL_BOARD Sheet → Apps Script gateway (contract v2) → Android · FCM = push transport only · no Supabase.

## What 0.6.0 is
- Soft dark "control room at dusk" theme; Hebrew-only operational status; RTL layout actually enabled (`supportsRtl`).
- Per-project **time wall**: "פעילות אחרונה בפרויקט" with `DD/MM/YYYY HH:MM`, Hebrew relative age, and fresh/aging/stale/unknown against the board's Expected Cadence. Control Tower's own check is shown separately as diagnostics.
- Home: "עודכן לאחרונה" snapshot line + refresh, counts strip, "צריך אותי עכשיו" first, everything else by urgency; cached snapshot shown instantly with a visible warning if refresh fails.
- Full-screen project detail answering goal / state / last event / when / next / blocker / needs-Ariel / confidence.
- Gateway contract v2: `last_meaningful_progress`, `last_control_check`, `expected_cadence`, `progress_evidence`, `role` (project vs infrastructure), `snapshot_at`, `contract_version`; v1 fields preserved.

## One-time manual step still open (Ariel)
Redeploy the gateway with the regenerated `google-apps-script/control-tower-gateway/CombinedCode.gs` (Apps Script editor → replace Code.gs content → Deploy → *Manage deployments* → edit → new version). Until then the app runs against contract v1: activity shows "אין חותמת פעילות עדכנית" and the Activity tab says the gateway is old. Optional: set `CT_GATEWAY_TOKEN` as a GitHub secret to skip the on-device token entry.

## Evidence trail
- Run report: `docs/claude-runs/2026-09-18_control-tower-deep-ux-recovery_REPORT.md`
- Emulator screenshots: `docs/claude-runs/screenshots/2026-09-18_control-tower-0.6/`
- Portfolio reconciliation: `docs/control-tower/PORTFOLIO_RECONCILIATION_2026-09-18.md`
