# Claude Code Task — Control Tower Drive-First Mobile Backend Migration

**Date:** 2026-09-18
**Repository:** `arieldeitch/ai-project-management-platform`
**Execution branch:** `control-tower-apk-build`
**Target version:** Android private-use candidate v0.4.0
**Run type:** bounded architecture migration + implementation + verification
**Wall-clock budget:** 2 hours
**Review budget:** 1 targeted review
**Remediation budget:** 1 remediation cycle
**Do not expand scope beyond this task.**

## 0. Mission

Replace the Android Control Tower client's Supabase dependency with a Drive-first architecture:

**Google Drive / PROJECT_CONTROL_BOARD Sheet → Google Apps Script gateway → Android client**
with **Firebase Cloud Messaging (FCM)** retained only for push delivery.

Do not create a new Supabase project. Do not migrate portfolio truth into another database.

The goal of this run is to leave the repository with:
1. an Android v0.4.0 client that no longer depends on Supabase auth/data/functions;
2. repo-local Apps Script gateway source that reads/writes the existing canonical Control Tower Google Sheet;
3. mobile-only inbox/device-token storage in dedicated sheet tabs or equally lightweight Drive-owned resources;
4. FCM push wiring through the Apps Script gateway;
5. a reproducible CI build path;
6. a short one-time deployment handoff for Ariel;
7. a run report that distinguishes IMPLEMENTED from actually VERIFIED.

## 1. Canonical product/architecture decisions

Treat these as approved:

- Google Drive is the canonical Control Tower memory layer.
- Canonical portfolio state is the existing `PROJECT_CONTROL_BOARD` Google Sheet.
- Spreadsheet ID: `1EYeDgSd1yMUz7bPbreDlJX130yCay2BMtT_RyQoi2HA`.
- Existing primary tabs include `Projects` and `Connections`.
- Firebase project was created for Android package `com.ariel.controltower`.
- Supabase project ref `tbqdpvmlhtlrngoxbouf` is not present in Ariel's currently connected Supabase organization; do not depend on recovering it.
- No new paid backend.
- Firebase is push transport only, not the portfolio database.
- This is a private single-owner sideload app, not a public multi-user product.

## 2. Mandatory preflight

Before edits:

1. `git status`
2. `git fetch origin`
3. confirm branch `control-tower-apk-build`
4. record starting HEAD
5. compare branch to `origin/main`; do not merge/rebase as part of this task unless strictly required and safe
6. inspect at minimum:
   - `control-tower-android/app/build.gradle`
   - `MainActivity.java`
   - `PushNotifications.java`
   - `ShareReportActivity.java`
   - `.github/workflows/control-tower-apk.yml`
   - `supabase/`
   - existing task/run-report docs

Preserve unrelated work. Do not reset/clean.

## 3. Data model and gateway

Create repo-local source under a clear path such as:

`google-apps-script/control-tower-gateway/`

Include at minimum:
- `Code.gs`
- `appsscript.json`
- `README.md`
- any small helper modules needed

Gateway requirements:

### Fixed canonical resources
- Read portfolio data only from the approved spreadsheet ID.
- Read project state from `Projects`.
- Read connection state from `Connections` where needed.
- Create/use dedicated mobile-only operational tabs, idempotently:
  - `MobileInbox`
  - `MobileDevices`
  - optional `MobilePushState` if required for deduplication
- These tabs are operational transport state, not a second portfolio source of truth.

### API actions
Prefer a single bounded `doPost(e)` JSON interface. At minimum:
- `health`
- `portfolio`
- `submit_report`
- `register_device`
- `unregister_device`
- `test_push`

Return structured JSON with explicit success/error codes.

### Portfolio response
Return only fields the Android UI actually needs, for example:
- project id/name
- lifecycle
- RAG
- confidence
- current milestone
- next action
- blocker
- needs Ariel
- Ariel input
- last meaningful progress/control check
- primary link

Do not copy the full backlog.

### External report intake
Replace Supabase `control_commands` usage with `MobileInbox`.
Preserve the existing evidence boundary:
- external report enters as REPORTED;
- it does not become VERIFIED merely because the mobile gateway accepted it.

## 4. Security model for private v0.4

Do not use an unguessable URL as the only protection.

For this private single-owner build, implement the smallest defensible v0.4 gateway auth:
- a high-entropy shared gateway token stored in Apps Script Script Properties;
- Android receives it via build-time configuration/secret, not committed source;
- use POST JSON rather than query-string secrets;
- gateway validates it before any Drive read/write;
- gateway is restricted to fixed spreadsheet/resources and fixed supported actions;
- no arbitrary file IDs, sheet IDs, formulas, Drive paths or code execution supplied by the client;
- never return service-account credentials or script properties;
- document that a build-embedded shared token is a private-sideload compromise and is not suitable as a general multi-user auth design.

If a materially stronger owner-only approach can be implemented within the same 2-hour budget without adding paid infrastructure or significant Ariel setup, use it and explain why. Do not turn this into a Google OAuth project unless required.

## 5. Android migration

Remove the Supabase runtime dependency from Android user flows.

### App startup/auth
- Do not require Supabase login.
- Private owner build should open directly into the app once gateway configuration is present.
- If gateway config is absent, show one clear setup/configuration state rather than a fake login.
- Remove/retire Supabase access/refresh-token assumptions from `SharedPreferences`.

### Data
Replace direct Supabase REST calls with the Apps Script gateway.
Keep the four main tabs unless a compile-safe adjustment is needed:
- עכשיו
- פרויקטים
- סגן
- פעילות

### Share
`ShareReportActivity` must continue to accept Android ACTION_SEND text.
Its submit action should send the report to `MobileInbox` through `submit_report`.

### Device token lifecycle
- FCM token register → `register_device`
- token refresh → upsert
- logout semantics no longer apply; provide best-effort unregister only if there is a reset/disconnect flow
- keep notification permission requested in context, not on first launch before the UI exists

## 6. Push through Apps Script

The gateway is the sender layer for v0.4.

Expected approach:
- store Firebase server credential only in Apps Script Script Properties or another approved secret store;
- never commit service-account JSON/private key;
- mint short-lived OAuth access token server-side and call FCM HTTP v1;
- fixed Firebase project id is configuration, not a client-supplied parameter;
- `test_push` sends only to registered Control Tower device rows.

If Apps Script requires the Firebase service-account JSON for FCM v1, support that and document the exact Script Property name and one-time Ariel setup.
Do not claim push VERIFIED without a real received device notification.

### High-signal automatic pushes
Provide an idempotent scanner/trigger function for:
- a project newly becoming RED;
- `Needs Ariel` becoming Yes/true;
- a project entering `USER TEST REQUIRED` / equivalent explicit user-test state when represented in the board.

Deduplicate with `MobilePushState` or Script Properties.
Do not send a push on every refresh.
Document how to create the installable/time-driven trigger.

## 7. Firebase client config / CI

Existing workflow expects `GOOGLE_SERVICES_JSON` as a GitHub Actions secret.

Preserve a secure path:
- do not commit Firebase service-account JSON;
- do not expose private keys;
- keep client config handling reproducible;
- keep build summary stating whether Firebase was configured.

If `google-services.json` itself is kept secret-based, leave the workflow compatible and document the one exact manual secret step.
Do not block all independent code work on the secret being absent.

Increment Android version to:
- `versionName 0.4.0`
- next appropriate `versionCode`

Artifact naming must follow the real app version.

## 8. Retire Supabase mobile path

After the Drive-first path compiles:
- remove Supabase-specific Android constants, auth calls, REST paths and token-registration code;
- remove/retire Supabase backend scaffolding only where it is clearly owned by this abandoned mobile path;
- do not delete historical run/task documentation;
- do not touch other projects.

If deletion could destroy useful historical evidence, move/reference it as superseded instead of erasing context.

## 9. Verification

Run what is available locally and/or in CI.

Engineering checks:
- Android assembleDebug green
- lint no new blocking errors
- no Supabase endpoint/auth references remain in active Android runtime code
- Apps Script files syntax-reviewed
- fixed spreadsheet ID/action allowlist clearly present
- no service-account credential/private key in Git
- workflow still produces named APK

Product checks that may remain NOT VERIFIED until Ariel:
- Apps Script deployed
- live Drive-backed portfolio response
- Share report reaches MobileInbox
- FCM token reaches MobileDevices
- real push received and tap opens app

## 10. One-time deployment handoff

Create a concise file:
`docs/claude-runs/2026-09-18_control-tower-drive-first_DEPLOYMENT_STEPS.md`

It must contain the minimum exact steps Ariel needs, ideally:
1. create/open Apps Script project;
2. paste/deploy the repo-provided script as Web App, execute as Ariel;
3. set only the required Script Properties;
4. authorize the script;
5. provide the deployment URL / GitHub build secret values where required;
6. rebuild APK;
7. perform physical-device test.

Keep it non-technical and bounded. Do not ask Ariel to learn Apps Script internals.

## 11. Required run report

Write:
`docs/claude-runs/2026-09-18_control-tower-drive-first_REPORT.md`

Report:
- starting/ending SHA
- files changed
- exact architecture implemented
- Android version/artifact
- Supabase removal evidence
- Apps Script actions/data tabs
- security model and residual risk
- Firebase/FCM state
- CI/build/lint evidence
- exact external setup remaining
- whether Ariel is now at USER TEST REQUIRED or still at PRE-TEST SETUP

Evidence labels:
- VERIFIED
- IMPLEMENTED — NOT VERIFIED
- BLOCKED
- UNKNOWN

## 12. Exit bar

SUCCESS if:
- no new Supabase project is required;
- Android active runtime is migrated away from Supabase;
- Drive/Sheet gateway implementation is in repo;
- FCM gateway sender is implemented;
- CI builds v0.4.0;
- remaining Ariel work is one bounded deployment/configuration sequence followed by physical-device acceptance.

Do not call PRODUCT GREEN until the physical-device Drive + Share + Push path is observed.
