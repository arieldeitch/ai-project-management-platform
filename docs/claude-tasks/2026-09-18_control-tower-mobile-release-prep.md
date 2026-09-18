# Claude Code Task — Control Tower Mobile Release Prep

**Date:** 2026-09-18
**Repository:** `arieldeitch/ai-project-management-platform`
**Execution branch:** `control-tower-apk-build`
**Primary target:** Android private-use install on Ariel's phone
**Run type:** bounded implementation + verification
**Wall-clock budget:** 2 hours
**Review budget:** 1 review round
**Remediation budget:** 1 remediation cycle
**Do not expand scope beyond this task.**

## 0. Mission

Take the existing native Android Control Tower client from experimental APK status to a clean, installable private mobile release candidate for Ariel.

This run is specifically about:
1. reliable Android installation/build output;
2. push-notification capability;
3. branded launcher icon/logo;
4. release/version/build hygiene;
5. verification that the app is pointed at a valid, owned Control Tower backend;
6. a concise run report stating what is truly working vs still gated.

Do **not** redesign the Control Tower product, add unrelated features, refactor the web platform, or change portfolio governance.

## 1. Verified starting evidence

Current repository evidence observed before this task:
- Android implementation exists under `control-tower-android/` on branch `control-tower-apk-build`.
- Android applicationId / namespace: `com.ariel.controltower`.
- Current `versionName`: `0.2.0`; `versionCode`: `2`.
- Current Android range: minSdk 26, target/compileSdk 35.
- Main app has four tabs: עכשיו / פרויקטים / סגן / פעילות.
- Supabase auth and REST calls are implemented directly in native Java.
- Share intake exists through `ShareReportActivity` for text shared from Claude/Gemini/Copilot.
- App currently points to Supabase ref `tbqdpvmlhtlrngoxbouf`.
- Existing manifest currently declares INTERNET only.
- No verified FCM / push implementation exists.
- No verified custom launcher icon/adaptive icon exists.
- Current GitHub Action builds a **debug** APK.
- Current workflow output filename says `ControlTower-v0.1.0.apk`, which does not match app `versionName 0.2.0`.
- Repository branch state is diverged relative to `main`; do not destroy or blindly merge the Android branch.

## 2. Mandatory preflight

Before editing:
1. `git status`
2. `git fetch origin`
3. `git branch --show-current`
4. confirm branch is `control-tower-apk-build` or deliberately switch only if the working tree is clean;
5. `git log --oneline --decorate -12`
6. compare `origin/main` and `origin/control-tower-apk-build`.
7. inspect:
   - `control-tower-android/app/build.gradle`
   - `control-tower-android/app/src/main/AndroidManifest.xml`
   - `MainActivity.java`
   - `ShareReportActivity.java`
   - `.github/workflows/control-tower-apk.yml`

If local uncommitted work exists, preserve it and do not reset/clean.

If the branch has dangerous divergence that cannot be reconciled safely inside this run, stop only the risky merge/rebase action; continue all branch-local work that is safe and report the divergence.

## 3. Product boundary

This is **not** a general UI redesign.

Preserve:
- existing dark Control Tower visual language;
- Hebrew RTL behavior;
- current four-tab information architecture;
- authenticated single-owner access intent;
- Share-to-Control-Tower flow;
- Supabase as structured backend;
- Control Tower evidence/status semantics.

Do not:
- revive the old web platform as the source of truth;
- copy the old local-first IndexedDB model into Android;
- add chat/social features;
- add background polling spam;
- broaden multi-user scope;
- create another project-management truth;
- weaken auth/RLS to make the app work.

## 4. Mobile release requirements

### A. Build / installability

Produce one reproducible Android artifact suitable for Ariel to sideload onto his Android phone.

For this private-use milestone:
- a debug-signed APK is acceptable **if it is reproducible, clearly named and installs cleanly**;
- do not block the run on Play Store signing;
- do not create or commit signing secrets.

Fix build/version hygiene:
- use a single current app version for this milestone: **0.3.0**;
- increment versionCode appropriately;
- make GitHub Actions artifact filename match the actual version;
- include commit SHA in build metadata or run report;
- make workflow artifact name unambiguous.

Expected artifact naming example:
`ControlTower-0.3.0-debug.apk`

Run:
- Java/Gradle compile;
- Android build;
- any available lint/unit checks that are reliable within budget.

### B. Push notifications — required capability

Implement Android push readiness using Firebase Cloud Messaging (FCM), unless repository evidence proves an already-adopted equivalent.

Minimum client requirements:
- add required Firebase Messaging dependencies using pinned compatible versions;
- Android 13+ `POST_NOTIFICATIONS` permission;
- runtime notification permission request at a sensible moment after login, not before context exists;
- notification channel for high-signal Control Tower alerts;
- FCM service class to receive messages;
- show system notification with concise Hebrew title/body;
- notification tap opens the Control Tower app;
- if payload contains a project identifier or target section, preserve enough data for future deep-link routing; implement deep-link only where low risk;
- obtain/refresh FCM token;
- register token only for authenticated owner;
- remove/disable token on logout where practical.

### C. Backend push contract

Do not hide backend uncertainty.

Current APK points to Supabase project ref:
`tbqdpvmlhtlrngoxbouf`

Before claiming push is end-to-end:
1. verify this is the intended Control Tower backend;
2. verify auth and owner-only access;
3. verify required tables/endpoints exist;
4. verify RLS/authorization for any token registration table.

If backend access is available:
- add a migration for a minimal device/push token table with owner-scoped RLS;
- never store Firebase service-account credentials in Git;
- add a Supabase Edge Function or equivalent server-side sender for FCM;
- FCM server credential must be a platform secret;
- implement a bounded **test push** path;
- do not add a public unauthenticated push endpoint.

Suggested notification events for the first release:
- project becomes RED;
- `needs_ariel` becomes true;
- explicit Control Tower test notification.

Do not create noisy notifications for every status refresh.

If Firebase project credentials or the intended Supabase project are not available:
- complete all repo-side client/server code and migration scaffolding possible;
- make the external gate explicit;
- provide the exact minimal setup inputs Ariel must supply;
- do not falsely mark end-to-end push GREEN.

### D. Logo / launcher branding

Create a clean native Android adaptive icon and in-app brand mark.

Design direction:
- dark navy / near-black base consistent with the app;
- one simple cyan/blue **control-tower / radar** symbol;
- recognizable at 48px;
- no small text inside the launcher icon;
- simple geometry, not decorative illustration;
- should read as “control / signal / oversight,” not as an airplane or generic settings icon.

Implementation:
- vector/adaptive launcher icon resources;
- foreground/background layers;
- Android monochrome icon where supported;
- manifest uses the branded icon;
- splash/startup branding uses the same mark when practical;
- preserve accessibility/contrast.

Do not introduce a paid design dependency.

### E. Auth / backend safety

Do not weaken current owner-only intent.

Important:
- publishable Supabase key in client code is not by itself a secret, but security must rely on correct auth/RLS;
- never add `service_role`, FCM service credentials, passwords or private keys to the APK/repo;
- inspect current signup behavior. If open self-signup conflicts with the owner-only design, do not silently leave a multi-user hole.
- prefer a single-owner allow-list / server-authorized model.
- if changing auth requires a product/security decision, keep current behavior only long enough to validate and flag it as a blocker for release.

## 5. UX acceptance

On a physical Android phone, the intended experience is:

1. Ariel installs the APK.
2. Launcher shows the new Control Tower icon.
3. App opens with branded login.
4. Ariel authenticates.
5. Main navigation works without horizontal overflow.
6. Portfolio data loads.
7. Share → Control Tower remains available from another app.
8. Android asks for notification permission after login/context.
9. A test push can arrive and open the app.
10. No obviously broken English/RTL/layout appears on the primary screens.

Do not spend this run polishing secondary UI if these ten items are not complete.

## 6. Required verification gates

### ENGINEERING GATE
Green only if:
- build passes;
- APK artifact exists;
- app manifest is valid;
- no secret material committed;
- notification client compiles;
- auth/API behavior still compiles and existing core flows are not broken;
- workflow produces correctly named artifact.

### PRODUCT GATE
Green only if:
- APK is realistically installable on Ariel's phone;
- branded icon exists;
- current primary screens remain usable;
- push capability is either proven end-to-end or explicitly AMBER with one clear external credential/configuration gate.

Do not call the product GREEN from code presence alone.

## 7. Circuit breaker

Maximum:
- one implementation pass;
- one targeted review;
- one remediation cycle.

Do not start a second broad reviewer loop.
If only external Firebase/Supabase credentials remain, stop and report the exact gate instead of continuing to churn.

## 8. Required output / run report

Create:
`docs/claude-runs/2026-09-18_control-tower-mobile-release-prep_REPORT.md`

Report:
- starting branch + HEAD;
- ending branch + HEAD;
- files materially changed;
- Android version produced;
- exact APK artifact path/name;
- build/test commands and results;
- logo/icon status;
- push client status;
- backend/token-table/Edge Function status;
- whether a **real push** was received on a device (VERIFIED / NOT VERIFIED);
- auth/RLS findings;
- remaining external gates;
- any residual risk;
- recommended next action;
- whether Ariel is needed;
- run end timestamp in Asia/Jerusalem.

Use evidence labels:
- VERIFIED
- IMPLEMENTED — NOT VERIFIED
- BLOCKED
- UNKNOWN

## 9. Final exit bar

Success for this run is:

**Control Tower 0.3.0 exists as a clean installable Android candidate with branded launcher icon, correct build/version naming, and push infrastructure implemented; the run report clearly proves whether push is actually end-to-end or identifies the single remaining external setup gate.**

No unrelated work.
