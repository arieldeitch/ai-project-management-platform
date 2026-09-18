# Run Report — Control Tower Drive-First Mobile Backend Migration

**Task:** `docs/claude-tasks/2026-09-18_control-tower-drive-first.md` (+ one-pager)
**Run end (Asia/Jerusalem):** 2026-09-18 12:25 IDT
**Budget used:** 1 implementation pass, 1 targeted review (CI build), 1 remediation cycle (Groovy escaping fix). Circuit breaker respected.

## SHA

| | Branch | HEAD |
|---|---|---|
| Start | `control-tower-apk-build` | `3ae1e96` |
| End (code that built the artifact) | `control-tower-apk-build` | `9efd5bea40f0e17f4bf6812565c677ba27363846` |
| End (incl. this report + deployment steps) | `control-tower-apk-build` | see final commit in `git log` |

Commits: `f167187` (move Supabase scaffolding to superseded), `a4a17da` (Drive-first client, gateway, CI), `9efd5be` (build.gradle escaping fix).
Preflight: tree clean, no merge/rebase against `main` (branch 20+ ahead / 2 behind; not required for this task).

## Product state: **PRE-TEST SETUP** (not yet 🧪 מחכה לאריאל)

All repo-side work is done and the v0.4.0 APK is built, but the gateway is **not deployed** and the three build
secrets are **not set**, so Ariel cannot yet run the acceptance test on the phone. One bounded sequence
(`…_DEPLOYMENT_STEPS.md`, ≈ 25 min) moves it to 🧪 USER TEST REQUIRED.

## Architecture implemented

```
PROJECT_CONTROL_BOARD (Sheet 1EYeDgSd1yMUz7bPbreDlJX130yCay2BMtT_RyQoi2HA)
   ├─ Projects / Connections  (read-only truth)
   └─ MobileInbox / MobileDevices / MobilePushState  (mobile transport tabs, created idempotently)
            ▲ POST JSON {token, action, …}
Google Apps Script Web App  (google-apps-script/control-tower-gateway/, executes as Ariel, access Anyone, token-gated)
            ▲ https                                     │ FCM HTTP v1 (service account in Script Properties)
Android 0.4.0 (Gateway.java)                            ▼
                                            Firebase Cloud Messaging → device (transport only)
```

No Supabase, no new database, no paid infrastructure.

## Android version / artifact — VERIFIED

- `versionName 0.4.0`, `versionCode 4`, `com.ariel.controltower`, minSdk 26 / target 35
- GitHub Actions run **35328716223** on `9efd5bea40f0e17f4bf6812565c677ba27363846`
- Artifact `ControlTower-0.4.0-debug` → `ControlTower-0.4.0-debug.apk` (2,591,838 bytes) + `.sha256`
- SHA-256 `2b3e20430702d0eaea4cf88771f6981fcab16283fff28967b8b22476b3770f24`
- Build summary: `Gateway configured in build: false`, `Firebase configured in build: false` (secrets not set yet) → this APK opens on the **setup screen** and reports push as "לא מוגדר". After the secrets are set and the workflow re-run, the resulting APK opens straight into the app.

## Supabase removal — VERIFIED

- `grep -ri supabase control-tower-android/app/src control-tower-android/app/build.gradle` → 0 hits.
- Built APK: `classes*.dex` contain 0 occurrences of `supabase`; `classes3.dex` contains the gateway client strings (`script.google.com`, `GATEWAY_TOKEN`).
- Removed: `SUPABASE_URL` / `SUPABASE_KEY` / `AUTHORIZED_EMAIL` build fields, login/signup screen, `/auth/v1/*`, `/rest/v1/*`, `/functions/v1/*` calls, access/refresh-token prefs (purged on first 0.4.0 launch), Supabase token registration.
- `supabase/` (0.3.0 scaffolding) moved to `docs/superseded/supabase-mobile-push/` with `SUPERSEDED.md`. Historical run/task docs untouched.

## Apps Script gateway — IMPLEMENTED — NOT VERIFIED (not deployed; sheet not reachable from this session)

Files: `appsscript.json`, `Code.gs`, `Config.gs`, `Portfolio.gs`, `Inbox.gs`, `Devices.gs`, `Push.gs`, `Scanner.gs`, `README.md`.

| Action | Behaviour |
|---|---|
| `health` | spreadsheet title, tabs, resolved/unresolved Projects columns, active devices, fcm_configured, scanner trigger state |
| `portfolio` | Projects rows → id, key, name, lifecycle, rag, confidence, milestone, next_action, blocker, needs_ariel, ariel_input, last_check, link, objective, risk, user_test_required; `include_connections` adds a name/status/note view of Connections |
| `inbox` | latest MobileInbox rows (newest first) |
| `submit_report` | append to MobileInbox as **REPORTED / evidence REPORTED** (sources: share, deputy_command, manual) |
| `register_device` / `unregister_device` | upsert / delete in MobileDevices keyed on token; older rows of the same device_id deactivated |
| `test_push` | FCM v1 to active device rows only |
| `activity` | recent push events from MobilePushState |

- Column detection: Projects headers matched by English/Hebrew aliases; `PROJECTS_COLUMN_MAP` script property overrides; `health` exposes what is unresolved. **The real header names are UNKNOWN** (the sheet is in Ariel's account, not the connector's) — this is the most likely thing to need a one-line `PROJECTS_COLUMN_MAP` after `debugHealth`.
- Scanner: `scanHighSignalEvents` on a 15-minute trigger (`installScannerTrigger`), pushes only on newly RED / Needs Ariel newly true / lifecycle newly matching `user test required` / `מחכה לאריאל`; first run seeds `MobilePushState` silently.
- Static checks VERIFIED: all `.gs` pass `node --check`; every `helper_()` reference resolves across files; `appsscript.json` is valid JSON. Fixed spreadsheet id and the action allow-list are literal constants (`Config.gs`, `Code.gs`).

## Security model and residual risk

- Shared `GATEWAY_TOKEN` (≥ 32 chars) in Script Properties, sent in the POST body, constant-time digest compare **before any Drive access**, 250 ms delay on failure, script lock around actions, 64 KB body cap, fixed resources, no client-supplied IDs/ranges/formulas, GET returns nothing. Secrets and service account never returned.
- **Residual risk (documented in README and in `Gateway.java`):** the token is embedded in a sideloaded APK and can be extracted from it; acceptable for one owner/one phone, not a multi-user design. Mitigation = rotate token + rebuild. A Google Sign-In/ID-token scheme was judged out of the 2-hour budget and not required for private use.
- Web App runs as Ariel with "Anyone" access — required so the phone can call it without Google sign-in; the token is the only gate.
- Firebase service account JSON lives only in Script Properties; `google-services.json` only in a GitHub secret and git-ignored. Git scan of the diff: no private keys, no service-account material.

## Firebase / FCM — IMPLEMENTED — NOT VERIFIED

- Client: unchanged 0.3.0 FCM stack (pinned BoM 33.7.0, channel, permission after the main screen exists, messaging service, tap routing extras) now registering through `register_device`. Token refresh → upsert; "נתק מכשיר והגדר מחדש" → best-effort `unregister_device` + `deleteToken()`.
- Server: `Push.gs` mints an RS256 JWT with `Utilities.computeRsaSha256Signature`, exchanges it for an OAuth token (cached 50 min), calls `projects/<project_id>/messages:send` with notification + data + `channel_id`. Project id from the service account. Unregistered tokens pruned.
- **No real push was received on a device.** FCM_SERVICE_ACCOUNT_JSON is not set anywhere yet.

## CI / build / lint evidence

| Check | Result |
|---|---|
| `gradle :app:assembleDebug` | BUILD SUCCESSFUL (64 s) — VERIFIED (first attempt failed on a Groovy escaping typo in `build.gradle`; fixed in `9efd5be`) |
| `gradle :app:lintDebug` | **0 errors**, 28 warnings — VERIFIED. Δ vs 0.3.0 (20): +9 `SetTextI18n` (string concatenation in Hebrew status lines), +1 `HardwareIds` (`ANDROID_ID` used as device_id for MobileDevices). No new blocking errors. |
| Workflow artifact naming | `ControlTower-0.4.0-debug` from `versionName` — VERIFIED |
| Local Java/SDK/adb | NOT AVAILABLE on this machine; all compile evidence is from CI |
| Install on Ariel's phone | NOT VERIFIED |

## Files changed

- `control-tower-android/app/build.gradle` — 0.4.0/4, `GATEWAY_URL`/`GATEWAY_TOKEN` from `CT_GATEWAY_*`, Supabase fields removed
- `…/Gateway.java` (new), `…/MainActivity.java` (rewritten: setup state, gateway tabs), `…/ShareReportActivity.java` (gateway submit), `…/PushNotifications.java` (gateway register/unregister/test), `…/ControlTowerMessagingService.java`
- `.github/workflows/control-tower-apk.yml` — `CT_GATEWAY_URL` / `CT_GATEWAY_TOKEN` secrets, "Gateway configured" summary line
- `google-apps-script/control-tower-gateway/*` (new, 9 files)
- `supabase/**` → `docs/superseded/supabase-mobile-push/**` + `SUPERSEDED.md`
- `docs/claude-runs/2026-09-18_control-tower-drive-first_DEPLOYMENT_STEPS.md`, this report

## Exact external setup remaining (one bounded sequence — Ariel)

See `2026-09-18_control-tower-drive-first_DEPLOYMENT_STEPS.md`. In short:
1. Sheet → Extensions → Apps Script → paste the 8 repo files → script property `GATEWAY_TOKEN` → run `debugHealth` (fix `PROJECTS_COLUMN_MAP` if needed) → deploy Web app (Me / Anyone) → run `installScannerTrigger`.
2. Firebase → service-account key → script property `FCM_SERVICE_ACCOUNT_JSON`; download `google-services.json`.
3. GitHub secrets `CT_GATEWAY_URL`, `CT_GATEWAY_TOKEN`, `GOOGLE_SERVICES_JSON` → re-run the workflow → install `ControlTower-0.4.0-debug.apk`.
4. Physical test: portfolio loads, permission, MobileDevices row, test push arrives and opens the app, share → MobileInbox, deputy command → MobileInbox.

## Evidence summary

| Item | Label |
|---|---|
| No new Supabase project required | VERIFIED |
| Android runtime migrated off Supabase | VERIFIED (source + dex) |
| Gateway source in repo, syntax-checked, fixed IDs/allow-list | VERIFIED (static) |
| Gateway deployed / live portfolio response | NOT VERIFIED (BLOCKED: sheet + Apps Script only in Ariel's account) |
| FCM sender through gateway | IMPLEMENTED — NOT VERIFIED |
| CI builds 0.4.0 | VERIFIED |
| Share → MobileInbox, token → MobileDevices, push received, tap opens app | NOT VERIFIED (needs Ariel's device) |
| Projects column headers | UNKNOWN (alias detection + override provided) |
