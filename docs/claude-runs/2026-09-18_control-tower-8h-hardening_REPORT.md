# Run Report — Control Tower 8-Hour Autonomous Hardening & Daily-Use Release (0.7.0)

**Task:** `docs/claude-tasks/2026-09-18_control-tower-8h-hardening.md` (+ one-pager)
**Run window (Asia/Jerusalem):** 2026-09-18 ~16:20 → 17:45 IDT (all phases either fully evidenced or stopped at a genuine external gate; no time was spent churning)

## Identity

| | Value |
|---|---|
| Starting SHA | `616b3d6` (0.6.0 + hardening task docs) |
| Code commits | `a4d7fb0` (timestamp/freshness truth, daily-use polish, persistent signing), `e382166` (emulator-review remediation) |
| **Final code SHA** | **`e38216665e5edffa66fde89111d82b01a83c10f2`** |
| Final docs SHA | the commit that adds this report (see `git log -1`) |
| **Workflow run** | **35356798804** — all steps green (secret scan, gateway tests, signing, debug + release build, apksigner verification, unit tests, lint, uploads) |
| **Release artifact** | **`ControlTower-0.7.0-release`** → `ControlTower-0.7.0-release.apk`, 2,068,741 bytes, SHA-256 `ca8d623894a00c0458050bda2f740b91aa209328573f0fb042af173398fb51f1` |
| Debug artifact (review only) | `ControlTower-0.7.0-debug` → `ControlTower-0.7.0-debug.apk`, 2,616,436 bytes, SHA-256 `f3dd0d8acdef2fa4b452deab46009cc8f4fe473603b7f3397eee5ab00f805cc0` |
| Version | `versionName 0.7.0`, `versionCode 8`, package `com.ariel.controltower` (unchanged) |
| Signing | persistent key, alias `controltower`, cert SHA-256 `00151c986c8be1e3cd82bc345b5af84bbc41ca2e951125f47a070e229d7c7950`, valid to 2056; CI APK re-verified locally with `apksigner` (v2 + v3, same fingerprint) |

## Gates

- **Engineering: 🟢 GREEN** — every item in §12 that is achievable from the repo is evidenced below.
- **Product: 🟡 AMBER — 🧪 מחכה לאריאל — USER TEST REQUIRED.** Emulator review + one remediation pass done; physical-device acceptance pending.
- **Push: not GREEN** — client plumbing VERIFIED on the emulator; server credential is an external gate.

## Phase results

### A — Product critique (emulator + 0.6 screenshots)
Ranked list. P0: none. **P1 (all implemented):** (1) portfolio "last activity" line named no project → "הכי עדכני: Ariel Life OS · 18/09/2026 16:00 · לפני 53 דקות"; (2) scroll position lost on in-place refresh → preserved; (3) refresh/registration churn (two `register_device` calls per launch, a portfolio fetch on every tab switch) → snapshots < 45 s are not refetched (explicit רענון forces), FCM registration throttled to 24 h per token; (4) long "מה קרה לאחרונה" evidence → first 280 chars + "הצג עוד"; (5) accessibility → TalkBack descriptions on nav/refresh/expand, link buttons 44 dp. **P2 deliberately not done:** search/filter (six projects — no material gain), collapsible secondary detail (the "נתוני בקרה" card is three lines).

### B — Information truth (primary phase)
- **Timestamp shapes** (gateway `parseCellDate_` and Android `TimeText.parse`, both tested): Date cells; ISO with `Z`/`±hh:mm`/`±hhmm`; `YYYY-MM-DD[ HH:mm[:ss]]` and `DD/MM/YYYY[ HH:mm]` as Israel wall clock (explicit DST rule, deterministic in any runtime); one leading status word (`VERIFIED|REPORTED|DONE|CHECKED|UPDATED|OK|מאומת|דווח`) then an anchored timestamp, e.g. `VERIFIED 2026-09-17 08:07: nightly sync ran`. **Rejected:** prose, dates mid-sentence, `yesterday`, `20260918`, `18/09/26`. Raw text is preserved (`*_raw`) and shown in the time wall as "בלוח רשום: …". Failure never substitutes the control check.
- **Three times, never conflated:** card = `last_meaningful_progress`; detail adds "בדיקת Control Tower אחרונה"; header = device sync time. Tests: `projectActivityIsDistinctFromControlCheck`, `v1GatewayPayloadDegradesToUnknownActivityNotToControlCheck`.
- **Freshness:** `Freshness.Reason` added — unreadable/blank cadence → `UNKNOWN/NO_CADENCE` with "קצב צפוי לא הוגדר בלוח — לא ניתן לקבוע אם המידע ישן" (never stale; excluded from the "ישן" count and from urgency). Exact boundary tests (age = cadence → fresh; +1 ms → aging; 2× → aging; 2×+1 → stale; future timestamp → fresh). Cadence vocabulary: hourly / every hour, twice daily, every N hours/days/weeks, daily (incl. "daily while active", weekdays), Nx/week, biweekly, monthly, quarterly, Hebrew equivalents; "as needed"/"ad hoc" → unknown.
- **Data completeness:** gateway test pins the brief's exact column names (ID, Project, Lifecycle, RAG, Confidence, Objective, Current Milestone, Progress Evidence, Next Action, Blocker / Dependency, Needs Ariel, **Ariel Decision / Input**, Risk / Drift, Last Meaningful Progress, Last Control Check, Expected Cadence, Primary Link) and asserts no two fields share a column.
- **Connections (known historical issue): VERIFIED broken → fixed.** The old aliases (`connection/name/system/source`) could not resolve `Platform` / `Verification Status` / `Evidence / Connector`; new aliases + a test with those exact headers.
- **Canonical coverage / CoS reconciliation:** re-checked; facts unchanged from `PORTFOLIO_RECONCILIATION_2026-09-18.md`. Runtime renders live rows only (no hardcoded list); tests use the six names as the acceptance fixture; "AI Control Tower" stays `role=infrastructure`. Cross-repo follow-up remains: the CoS fixture (`../chief-of-staff/src/domain/fixtures.ts`) still lists AI Control Tower + News Agent and omits Ariel Life OS — not edited here.

### C — Daily-use interaction
Back is deterministic (detail → its list → Home → exit, unchanged); cached content renders instantly and refreshes in place; the stale-copy warning now appears **only** when a refresh actually failed (fixed in remediation — the throttle path had shown a false warning); no full-screen blank when cache exists; two degraded states captured (gateway down with cache → amber banner + refresh; gateway down without cache → error card + "נסה שוב"). Lifecycle: single executor per activity, shut down in `onDestroy`; permission asked once; registration throttled; no evidence of main-thread network.

### D — Release / update continuity (VERIFIED)
- Keystore generated locally with `keytool` (RSA-4096, PKCS12, 30 years) **outside the repo** (`%USERPROFILE%\.android\control-tower-signing\`); passwords random, never printed.
- Four GitHub Actions secrets set through the authenticated `gh` CLI from files (`CT_RELEASE_KEYSTORE_B64`, `CT_RELEASE_KEYSTORE_PASSWORD`, `CT_RELEASE_KEY_ALIAS`, `CT_RELEASE_KEY_PASSWORD`); presence verified by name only; temp base64/value files deleted.
- Gradle: `signingConfigs.release` from env (path/passwords), v2+v3; `buildTypes.release` unminified, non-debuggable; debug path untouched. CI decodes the keystore into `$RUNNER_TEMP`, builds `assembleRelease`, verifies with `apksigner --print-certs`, records the fingerprint (`.cert-sha256` sidecar + step summary), deletes the temp keystore, uploads `ControlTower-<v>-release` (90-day retention). Secret scan additionally fails on any tracked `.jks/.keystore/.p12/.pem`.
- **Emulator proof:** release over the debug-signed build → `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (this is why 0.6.0 → 0.7.0 needs one uninstall); release baseline installed, then a second release build (different SHA) installed over it → `Success`, `firstInstallTime` unchanged (14:32:07), `lastUpdateTime` advanced (14:32:32). 0.7.0 is the long-term baseline.

### E — Gateway deployment automation (bounded, 20 min)
No `clasp`, Apps Script API credentials or Google session exist on this machine, and creating them is out of scope → deployment stays manual. Delivered instead: `verify-deployment.mjs` (token-free contract probe; error replies now carry `contract_version`/`gateway_version`) and `GATEWAY_DEPLOY_RUNBOOK.md`. **VERIFIED via the probe: the deployed Web App is still contract v1** (`gateway_version=(pre-0.7) contract_version=1`).

### F — Firebase / push readiness (bounded, 15 min)
No `gcloud`/`firebase` CLI or credentials exist; no Firebase project was created. Client side VERIFIED on the emulator: Firebase initialises from the tracked `google-services.json`, an FCM token is obtained and registered through the gateway (`register_device 200` in the fixture log). Server side: `FCM_SERVICE_ACCOUNT_JSON` not set → sending NOT VERIFIED; gate stays not-GREEN.

### G — Emulator review + remediation (Pixel 7, API 35, WHPX)
Screens captured (`docs/claude-runs/screenshots/2026-09-18_control-tower-0.7/`): home, home-attention-cards, projects, projects-calm-and-unknown-cadence, project-detail, deputy, activity, degraded-gateway-down-cached, degraded-gateway-down-no-cache. Review questions: pleasant to open repeatedly — yes (charcoal, calm chips, no neon); status without technical text — yes; all operational labels Hebrew — yes (English only for proper names and the diagnostics line on Activity); time wall unmistakable — yes; stale obvious but not alarming — yes (amber, one sentence); all canonical projects present — yes (6); Chief of Staff correct — yes, and its raw `VERIFIED 2026-09-18 12:03: …` cell rendered as a real time wall with "לא ידוע · קצב צפוי לא הוגדר" for its "as needed" cadence; important information above the fold — yes; navigation unambiguous — yes; one coherent product — yes.
Remediation (one pass): false stale-copy warning on Projects; "בלי חותמת פעילות" count included the no-cadence case → split into two truthful lines; test added (`rawStatusPrefixedCellBecomesActivityAndUnknownCadenceIsNotStale`).

## Verification (run 35356798804 unless noted)

| Check | Result |
|---|---|
| Secret scan (keys, service-account JSON, token/password-shaped literals, tracked keystores) | clean |
| Gateway tests | 12/12 pass; `CombinedCode.gs is up to date` |
| Android unit tests | 15/15 pass (CI + local) |
| `assembleDebug` / `assembleRelease` | BUILD SUCCESSFUL |
| Release signature | `apksigner`: v2 true, v3 true, cert `00151c98…7c7950` (CI step + local re-verification of the downloaded artifact) |
| Lint | 0 errors, 18 warnings (pre-existing style classes) |
| Emulator smoke | launch, all tabs, detail, degraded states, install-over — done |
| Live gateway probe | reachable, fail-closed (`unauthorized`), contract v1 still deployed |

## Files changed
- Gateway: `Config.gs` (unchanged aliases + version), `Portfolio.gs` (hardened parser, Israel offset, Connections aliases), `Code.gs` (0.7.0, version markers on every reply), `CombinedCode.gs` (regenerated), `test/portfolio.test.mjs` (+4 tests), `verify-deployment.mjs` (new).
- Android: `model/TimeText.java`, `model/Freshness.java`, `model/Portfolio.java`, `MainActivity.java`, `PushNotifications.java`, `app/build.gradle` (0.7.0/8, signing), `app/src/test/…/PortfolioModelTest.java` (15 tests), `tools/review-gateway.mjs`.
- CI: `.github/workflows/control-tower-apk.yml` (signing, release verification/upload, stricter scan).
- Docs: this report, `docs/control-tower/RELEASE_STATUS.md`, `SIGNING_AND_UPDATES.md` (new), `GATEWAY_DEPLOY_RUNBOOK.md` (new), screenshots.

## Preserved
Drive-first architecture; token model and auth (unchanged); Firebase client plumbing and tracked `google-services.json` policy; share intake, deputy, activity, push registration; package id. No Supabase, no new backend/Firebase/Apps Script project. No secret printed or committed (recovery copy of the keystore lives only under `%USERPROFILE%\.android\control-tower-signing\`, outside Git).

## Remaining Ariel actions (absolute minimum)
1. **Redeploy the gateway once** — `docs/control-tower/GATEWAY_DEPLOY_RUNBOOK.md` (≈3 min; same URL and token). Until then every project shows "אין חותמת פעילות עדכנית".
2. **Install `ControlTower-0.7.0-release.apk`** from run 35356798804 (uninstall the old debug-signed build first — the last uninstall ever), enter the gateway token once, and judge it on the phone. That judgement flips Product from AMBER to GREEN.
Optional, not required for acceptance: paste the Firebase service-account JSON into Script Property `FCM_SERVICE_ACCOUNT_JSON` (enables push); add `CT_GATEWAY_TOKEN` as a GitHub secret (future installs need no on-device token entry).
