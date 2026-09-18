# Run Report — Control Tower Mobile Release Prep

**Task:** `docs/claude-tasks/2026-09-18_control-tower-mobile-release-prep.md`
**Run end (Asia/Jerusalem):** 2026-09-18 10:35 IDT
**Budget used:** 1 implementation pass, 1 targeted review, 1 remediation cycle (circuit breaker respected)

## Branch / HEAD

| | Branch | HEAD |
|---|---|---|
| Start | `control-tower-apk-build` | `dd0ac62` (docs: add Control Tower mobile release prep one-pager) |
| End | `control-tower-apk-build` | `64f5ca6` (see commits below) |

Commits this run:
- `1da2332` Control Tower 0.3.0: branded icon, FCM push readiness, release hygiene
- `64f5ca6` Drop API-27 style attribute from the base theme (lint NewApi)

Preflight: working tree was clean; `origin/main` is 2 commits ahead / branch 15 ahead (merge-base `9d74a03`). No merge or rebase was attempted — divergence is only the two "temporarily enable isolated APK build" commits on `main`, which is not risky but reconciling `main` was out of scope. No local work was discarded.

## Overall gates

| Gate | Status |
|---|---|
| ENGINEERING | 🟢 GREEN — build passes, artifact exists, manifest valid, no secrets committed, push client compiles, core flows untouched, workflow names artifact correctly |
| PRODUCT | 🟡 AMBER — installable branded 0.3.0 candidate exists; push is IMPLEMENTED — NOT VERIFIED behind one external configuration gate (Firebase + Supabase apply). Additionally an auth finding (open self-signup) is flagged as a release blocker for owner-only intent. |

## Android version produced

- `versionName 0.3.0`, `versionCode 3`, applicationId `com.ariel.controltower`, minSdk 26 / target 35
- BuildConfig carries `GIT_SHA` (first 12 of the commit) and `FIREBASE_CONFIGURED` (true only when `google-services.json` was present at build time). Both are shown on the פעילות tab.

## Exact APK artifact — VERIFIED

- GitHub Actions run **35319602363** on commit `64f5ca68deedaf3bfa41144cd10c9f14eeede8d0`
- Artifact name: `ControlTower-0.3.0-debug` → files `ControlTower-0.3.0-debug.apk`, `ControlTower-0.3.0-debug.apk.sha256`
- Size: 2,591,266 bytes
- SHA-256: `3a75be6d669b7dcd68ecec15677fc3eae00a19091608d48fd0f458f4f0e20be7`
- Signing: debug keystore of the CI runner (acceptable for private sideload per task §4A; not reproducible byte-for-byte across runs, but every run is named, checksummed and tied to a SHA in the step summary)
- Firebase configured in this build: **false** (secret `GOOGLE_SERVICES_JSON` not set) → app runs, push shows "לא מוגדר"
- Download: `gh run download 35319602363` or Actions → run → Artifacts

## Build / test commands and results

| Command (CI, ubuntu-latest, Temurin 17, Gradle 8.9, AGP 8.7.3) | Result |
|---|---|
| `gradle :app:assembleDebug --stacktrace` | BUILD SUCCESSFUL (61s) — VERIFIED |
| `gradle :app:lintDebug` (non-blocking) | 0 errors, 20 warnings — VERIFIED. Warnings are pre-existing style items (RtlHardcoded ×5, SetTextI18n ×4, DefaultLocale ×3, LockedOrientation ×2, DiscouragedApi ×2, OldTargetApi, GradleDependency, DataExtractionRules, ObsoleteSdkInt). Report uploaded as artifact `ControlTower-0.3.0-debug-lint`. |
| Local Java/Gradle/adb | NOT AVAILABLE on this machine (no JDK / Android SDK installed) — all compilation evidence is from CI. No unit tests exist in the project. |
| Install on Ariel's phone | NOT VERIFIED (no device attached to this session) |

The first CI build (`1da2332`, run 35319360005) already passed; the review pass found one pre-existing lint *error* (`NewApi`: `android:windowLightNavigationBar` is API 27, minSdk is 26), fixed in `64f5ca6` with no visual change.

## Files materially changed

Android (`control-tower-android/`):
- `app/build.gradle` — 0.3.0 / code 3, GIT_SHA + FIREBASE_CONFIGURED build fields, conditional `google-services` plugin, pinned `firebase-bom:33.7.0` + `firebase-messaging`, lint non-fatal
- `build.gradle`, `gradle.properties` (new), `.gitignore` (new: ignores `google-services.json`, keystores, build output); removed `BUILD_TRIGGER*` scratch files
- `app/src/main/AndroidManifest.xml` — `POST_NOTIFICATIONS`, branded `icon`/`roundIcon`, `singleTask` main activity, FCM service, default notification icon/color/channel meta-data
- `app/src/main/java/.../PushNotifications.java` (new) — channel, permission, token register/unregister, notification display, test-push call, status line
- `app/src/main/java/.../ControlTowerMessagingService.java` (new) — FCM receiver
- `app/src/main/java/.../MainActivity.java` — brand mark on login, `onSessionReady` after main screen, logout token cleanup, intent routing (`ct_target`), permission result, פעילות tab push status + test button + version line
- `res/drawable/ic_launcher_foreground.xml`, `ic_launcher_monochrome.xml`, `ic_brand_mark.xml`, `ic_notification.xml`, `res/mipmap-anydpi-v26/ic_launcher{,_round}.xml`, `res/values/colors.xml`, `strings.xml`, `values-v31/styles.xml` (Android 12+ splash), `values/styles.xml` (lint fix)

CI: `.github/workflows/control-tower-apk.yml` — version read from `build.gradle`, artifact `ControlTower-<version>-debug`, SHA-256 sidecar, step summary with commit SHA, optional `GOOGLE_SERVICES_JSON` secret materialisation, non-blocking lint + report artifact.

Backend scaffolding (`supabase/`): `README.md`, `migrations/20260918120000_control_push_tokens.sql`, `migrations/20260918120100_control_push_events.sql` (optional), `functions/control-tower-push/index.ts`.

Docs: this report.

## Logo / icon — IMPLEMENTED — NOT VERIFIED on device

- Adaptive icon with background (navy `#0B1220`), vector foreground (three cyan signal arcs over a blue tower mast + base) and monochrome layer for themed icons. Pure geometry, no text, kept inside the 66 dp safe zone.
- Rasterised locally at 48/72/192 px to check legibility: reads as signal/tower at 48 px (evidence: local preview only; real launcher rendering not observed).
- Same mark used for the Android 12+ system splash (`values-v31`) and as the in-app brand mark on the login screen. Status-bar notification icon is a flat single-colour variant.
- The APK contains `res/mipmap-anydpi-v26/ic_launcher.xml` and both foreground/monochrome drawables — VERIFIED by listing the artifact.

## Push client — IMPLEMENTED — NOT VERIFIED

- Dependencies pinned (`firebase-bom:33.7.0`), `POST_NOTIFICATIONS` declared, requested once on Android 13+ **after** the authenticated main screen is shown (not on the login screen).
- Channel `control_tower_alerts` (IMPORTANCE_HIGH, Hebrew name/description).
- `ControlTowerMessagingService`: `onNewToken` → owner-scoped upsert; `onMessageReceived` → system notification with concise Hebrew title/body; tap opens `MainActivity` with `ct_target` / `ct_project_id` / `ct_event` extras preserved. Low-risk deep link implemented: `target` selects the tab (now/projects/deputy/activity); project-level routing is preserved but not acted on.
- Token registered only when a session exists; deleted from the table (with the still-valid JWT) and `deleteToken()` on logout.
- Bounded test path: פעילות → "שלח התראת בדיקה" calls the Edge Function with the owner JWT and shows the result inline.
- Graceful without Firebase config: plugin not applied, `FirebaseMessaging` never touched, status line says "לא מוגדר". Compiles and runs either way — VERIFIED by CI build (config absent).

## Backend / token table / Edge Function

| Item | Status |
|---|---|
| Intended backend is `tbqdpvmlhtlrngoxbouf` | UNKNOWN as ownership — not among the 9 Supabase projects visible to this session's connector (`licenses-hq@norismedical.com` org). It is however clearly the Control Tower backend: reachable, and `control_portfolio` / `control_commands` / `control_activity` exist there (REST probes returned 401 "permission denied", i.e. tables exist, anon has no grant). Likely owned by `arieldeitch@gmail.com`. |
| Auth + owner-only access | PARTIAL — see auth findings |
| `control_push_tokens` table | BLOCKED (no admin access) — migration written, not applied. Probe returned 404 "not in schema cache" = does not exist yet. |
| RLS on token table | IMPLEMENTED in migration (all four operations `user_id = auth.uid()`, `authenticated` only, anon revoked) — NOT VERIFIED |
| Edge Function `control-tower-push` | IMPLEMENTED — NOT DEPLOYED. Owner-only (JWT verified by gateway + email check) or internal-secret path; FCM HTTP v1 with service account from platform secret `FCM_SERVICE_ACCOUNT_JSON`; prunes UNREGISTERED tokens. No unauthenticated endpoint. |
| Event triggers (RED / needs_ariel) | IMPLEMENTED as optional migration via `pg_net` + Vault secrets; inert if secrets missing — NOT VERIFIED |
| Secrets in Git | VERIFIED none: `google-services.json` and keystores git-ignored; only the publishable key (already present) and an env-var *read* of the service-role key inside the Deno function. |

## Real push received on a device: **NOT VERIFIED**

No Firebase project, no `google-services.json`, no FCM service account, and no admin access to the Supabase project were available in this session. End-to-end push is therefore **IMPLEMENTED — NOT VERIFIED**.

## Auth / RLS findings

1. **Open self-signup — release blocker for owner-only intent.** `/auth/v1/settings` on the backend returns `disable_signup: false` with email provider on. The app's "יצירת חשבון ראשונית" button plus the client-side email string check is not a security boundary: anyone holding the publishable key can create an account. Per task §4E current behaviour was kept; the fix is one dashboard toggle (Authentication → *Allow new users to sign up* = off) once the owner account exists. Whether the owner account already exists: UNKNOWN (not probed, to avoid side effects).
2. RLS on `control_portfolio` / `control_commands` / `control_activity`: anon is denied (VERIFIED). Whether policies are owner-scoped (`auth.uid()`) or merely `authenticated`: UNKNOWN — combined with finding 1 this matters.
3. Session tokens are stored in plain `SharedPreferences` (pre-existing; `allowBackup=false` mitigates). Not changed.

## Remaining external gates (single bounded setup)

All are in `supabase/README.md`:
1. Firebase project → Android app `com.ariel.controltower` → `google-services.json` content into GitHub secret **`GOOGLE_SERVICES_JSON`** → re-run the workflow (`gh workflow run control-tower-apk.yml`). This alone makes the APK register tokens.
2. Firebase service-account JSON → Supabase secret `FCM_SERVICE_ACCOUNT_JSON` (+ `CONTROL_TOWER_OWNER_EMAIL`, `CONTROL_TOWER_INTERNAL_SECRET`), `supabase db push`, `supabase functions deploy control-tower-push`.
3. Turn off self-signup in Supabase Auth.
4. (Optional) enable `pg_net` + three Vault secrets for RED / needs_ariel event pushes.

## Residual risk

- Debug signing: reinstalling from a different CI run may require uninstall first if Android sees a different debug key (the runner's debug keystore is regenerated per run). Acceptable for private use; a stable upload key is future work.
- `GradleDependency` lint warns a newer Firebase BoM exists; 33.7.0 was pinned deliberately for a known-good AGP 8.7.3 combination.
- Edge Function and migrations were written without being executed against the target project; a first `db push` may surface a column-name mismatch in the optional events trigger (`control_portfolio` columns were inferred from the client's JSON keys).

## Recommended next action

Ariel performs gate steps 1–3 above (≈15 minutes), then re-runs the workflow, installs `ControlTower-0.3.0-debug.apk`, logs in, accepts the notification permission, and taps "שלח התראת בדיקה". If a notification arrives and opens the app, flip push to VERIFIED in the next report; no further code is expected to be needed for that.

## Is Ariel needed?

**Yes — one bounded action:** supply the Firebase inputs (`GOOGLE_SERVICES_JSON` repo secret + service-account JSON as a Supabase secret), apply the migration/function, and disable open signup. Everything on the repo side is complete.

## Evidence labels used

VERIFIED · IMPLEMENTED — NOT VERIFIED · BLOCKED · UNKNOWN
