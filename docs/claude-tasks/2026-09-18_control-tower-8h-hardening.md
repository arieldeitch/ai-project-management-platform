# Control Tower — 8-Hour Autonomous Product Hardening & Daily-Use Release Run

Date: 2026-09-18
Owner: Control Tower
Execution budget: up to 8 hours
Execution mode: autonomous, repo-first, evidence-driven
Starting point: 0.6.0 deep UX recovery
Branch: control-tower-apk-build
Product gate at start: AMBER — physical-device acceptance still pending

## 0. North Star

By the end of this run, Control Tower should not merely be a good-looking prototype. It should be engineered as a calm, reliable daily-use control surface that Ariel can keep installed, update without friction, trust for freshness, and understand in seconds.

Use the full time budget intelligently. Do not stop after the first green build. Do not churn for the sake of time either: every phase must produce evidence or a deliberate no-change decision.

The ordering is:
1. product/UX quality;
2. information truth/freshness;
3. daily-use interaction quality;
4. release/update continuity;
5. deployment/push automation where safely possible;
6. final end-to-end QA and documentation.

## 1. Mandatory preflight — max 30 minutes

Before changing code:
- git fetch origin
- switch to control-tower-apk-build
- git pull --ff-only
- confirm clean working tree
- read CLAUDE.md / AGENTS.md
- read:
  - docs/claude-runs/2026-09-18_control-tower-deep-ux-recovery_REPORT.md
  - docs/control-tower/RELEASE_STATUS.md
  - docs/control-tower/PORTFOLIO_RECONCILIATION_2026-09-18.md
  - latest task / one-pager
- inspect current Android, Apps Script gateway, CI workflow, screenshots and tests.
- confirm no secret material is printed or committed.

Record the actual starting SHA in the run report.

## 2. Phase A — Deep product critique and information architecture — target 90 minutes

Do a real product review of the shipped 0.6.0 screens using the emulator and committed screenshots.

Review Home, Projects, Project Detail, Deputy, Activity with this exact lens:

### 2.1 One-glance comprehension
Within 5–10 seconds:
- Can Ariel identify how many canonical projects exist?
- Can he tell which ones need him?
- Can he tell which ones are red or stale?
- Can he tell what changed most recently?
- Can he see when the data itself was last refreshed?
- Is the most important information above the fold?

### 2.2 Visual comfort
The desired visual language remains:
- dark, but not near-black;
- calm charcoal/slate;
- readable without looking like a terminal;
- strong hierarchy;
- status colors present but restrained;
- touch-friendly;
- RTL first.

Do not switch back to light mode.

### 2.3 Information density
Ariel wants knowledge available, not minimalism for its own sake.

Home cards should be concise but useful.
Project detail should contain the complete operational picture without forcing a second system lookup.

Evaluate whether these fields are sufficiently exposed and understandable:
- project name;
- current status in Hebrew;
- current milestone/state;
- last meaningful progress summary;
- last meaningful progress time wall;
- next action;
- blocker/dependency;
- needs-Ariel input;
- risk/drift;
- confidence;
- last Control Tower check;
- expected cadence;
- primary link;
- provenance/freshness.

Remove information that is technical noise; do not remove operational knowledge.

### 2.4 Output of Phase A
Create a short UX defect list ranked P0 / P1 / P2.
Implement P0/P1 items in this run.
Only implement P2 items if they materially improve daily usability and fit without destabilizing the app.

## 3. Phase B — Information truth, timestamps and freshness — target 120 minutes

This is a primary functional phase, not a formatting phase.

### 3.1 Timestamp robustness
0.6 introduced:
- last_meaningful_progress
- last_control_check
- expected_cadence
- snapshot_at

Now harden them against real-world board data.

Support, safely and deterministically:
- native Date values;
- ISO strings;
- YYYY-MM-DD HH:mm;
- DD/MM/YYYY HH:mm if present;
- strings beginning with a verified timestamp such as:
  "VERIFIED 2026-09-17 08:07: ..."
  only when the timestamp is unambiguous.

Never infer a timestamp from arbitrary prose.

If timestamp parsing fails:
- preserve raw evidence for detail/diagnostics where useful;
- show "אין חותמת פעילות עדכנית";
- do not silently substitute last_control_check.

Add tests for every accepted timestamp shape and rejection cases.

### 3.2 Distinguish three times everywhere
Never conflate:
1. project activity time;
2. Control Tower verification/check time;
3. mobile snapshot sync time.

Primary card: project activity.
Detail: activity + Control Tower check.
Header: snapshot sync.

### 3.3 Freshness model
Review cadence parsing and make it robust but bounded.

Supported examples should include at minimum:
- hourly
- daily
- twice daily if represented
- weekly
- every N hours/days
- active-project "daily while active" patterns if safely recognized

If a cadence cannot be parsed:
- freshness = unknown, not stale;
- show a truthful Hebrew explanation.

Add boundary tests for fresh / aging / stale.

### 3.4 Data completeness
Verify that the gateway maps all useful current board columns without field collisions.

Re-check:
- Last Meaningful Progress
- Last Control Check
- Progress Evidence
- Expected Cadence
- Objective
- Current Milestone
- Next Action
- Blocker / Dependency
- Needs Ariel
- Ariel Decision / Input
- Risk / Drift
- Confidence
- Primary Link

Fix header aliases if necessary.

Known historical issue to verify:
Connections tab headers are likely "Platform", "Verification Status", "Evidence / Connector", etc. The old readConnections_ alias set may fail to resolve these. If still broken, fix it and add tests, even if Connections remains diagnostics-only.

### 3.5 Canonical project coverage
Preserve the canonical six project rows from the live board:
- Ariel Life OS
- Household OS
- Personal News Radar
- Tom AI Learning
- Nutrition App
- Chief of Staff

Do not hardcode this list as permanent runtime truth merely to pass a test.
Tests may use it as the current acceptance fixture, but runtime must render live canonical rows.

Infrastructure/capability rows remain separate.

### 3.6 Chief of Staff reconciliation
Re-check the discrepancy:
- stale CoS fixture has AI Control Tower and News Agent, omits Ariel Life OS;
- live board has Ariel Life OS and Personal News Radar, and Chief of Staff as P-006.

Do not edit the Chief of Staff repository in this task unless explicitly necessary and safe.
Do document any cross-repo follow-up precisely.

## 4. Phase C — Daily-use interaction polish — target 90 minutes

### 4.1 Navigation
No dead ends.
Back behavior must be deterministic:
detail -> Projects -> Home -> exit.

Bottom navigation must remain obvious in RTL.

### 4.2 Loading / refresh / offline
Improve perceived quality:
- show cached content immediately;
- refresh in place;
- avoid full-screen blank/loading if usable cached data exists;
- preserve scroll/location when practical;
- no duplicate refreshes from lifecycle churn;
- clear stale-copy indicator only when relevant.

### 4.3 Project detail
Make detail a joy to scan:
- strong section hierarchy;
- time wall prominent;
- "מה צריך ממך" visually distinct;
- "הבא" and blocker separate;
- long evidence available without overwhelming the main view;
- primary link obvious;
- no raw enums.

Consider collapsible secondary detail only if it improves clarity without fragile complexity.

### 4.4 Search / filtering
Evaluate whether a lightweight project search/filter materially improves daily use.
Only implement if it can be simple, fast, RTL-correct and low-risk.
Do not add feature bulk for its own sake.

### 4.5 Accessibility
Review:
- minimum touch targets;
- contrast;
- font sizes;
- truncation;
- TalkBack content descriptions where meaningful;
- RTL alignment;
- dynamic text resilience at moderate font scaling if feasible.

### 4.6 Performance / lifecycle
Review for:
- unnecessary network calls;
- leaked executors/listeners;
- repeated FCM registration;
- activity recreation issues;
- obvious main-thread work.

Fix only evidenced issues.

## 5. Phase D — Release/update continuity — target 90 minutes

This is high priority because Ariel should not have to uninstall the app for every update.

### 5.1 Stable signing
Investigate and, if safely possible, implement a persistent CI signing path so future APKs can install over previous signed candidates without data loss.

Preferred outcome:
- one persistent signing key;
- key/private material never committed;
- CI obtains it only from GitHub Actions secrets;
- alias/passwords are secrets;
- build produces a signed install-over APK;
- signing certificate fingerprint is recorded in release docs.

If GitHub CLI is authenticated locally and setting secrets can be done without printing secret values:
- it is acceptable to generate the keystore locally outside the repo;
- set the required GitHub secrets through authenticated CLI;
- verify secrets by name/presence only;
- delete temporary plaintext/base64 material after successful secret upload;
- never print keystore password, base64 or private bytes.

If a secure fully autonomous setup is not possible:
- prepare all code/workflow support;
- produce the smallest possible one-time Ariel action at the very end.
- do NOT commit a keystore to the public repository.

Do not break the existing debug build path.

### 5.2 Update continuity
Verify package id remains com.ariel.controltower.
Verify versionCode increments.
Document whether 0.6.0 can be upgraded in-place to the new candidate.
If not, state exactly why and make the new stable-signing candidate the long-term baseline.

### 5.3 Release artifact quality
Produce a clearly named candidate artifact.
Prefer a release-style signed APK when stable signing is available.
Record:
- versionName
- versionCode
- artifact name/id
- SHA-256
- signing cert SHA-256 fingerprint.

## 6. Phase E — Gateway deployment automation — target 45 minutes, bounded

Current manual blocker: Apps Script gateway v2 still needs deployment.

Investigate a safe automation path only if the local machine already has appropriate authenticated Google tooling.

Acceptable:
- existing authenticated clasp / Apps Script API setup;
- existing known script identity verified against the bound PROJECT_CONTROL_BOARD project;
- push/deploy without creating a new Apps Script project;
- preserve current deployment URL/token if the platform allows.

Not acceptable:
- creating a new Apps Script project;
- rotating/replacing the gateway token without need;
- changing backend architecture;
- storing OAuth/service-account secrets in Git;
- guessing a script ID;
- spending hours fighting auth.

Time-box discovery.
If safely deployable, deploy and verify health/contract_version.
If not, create a deterministic helper/runbook that reduces Ariel's action to the minimum and stop this phase.

## 7. Phase F — Firebase / push readiness — target 45 minutes, bounded

Do not let this derail UX/release quality.

Check current Firebase client plumbing and server-side push readiness.

If an already-authenticated Firebase/gcloud environment exists and the existing project can be safely verified:
- inspect only what is needed;
- complete server-side configuration without printing private keys;
- test device registration/test-push path where possible.

If not:
- do not create a new Firebase project;
- do not generate or expose unmanaged credentials;
- leave a minimal exact Ariel step only if still necessary.

Push Product Gate must remain not-GREEN until a real physical device receives a push and tapping it routes correctly.

## 8. Phase G — Final UX review + one remediation pass — target 60 minutes

Use emulator/API 35 again.

Capture current screenshots:
- Home
- Projects
- Project detail
- Deputy
- Activity
- one degraded/offline/stale state if feasible

Review with the exact questions:
- Is the screen pleasant enough to open many times a day?
- Can Ariel understand status without reading technical text?
- Are all operational labels Hebrew?
- Is the time wall unmistakable?
- Is stale data obvious but not alarming when appropriate?
- Are all canonical projects present?
- Is Chief of Staff represented correctly?
- Is important information above the fold?
- Is navigation unambiguous?
- Does the app feel like one coherent product rather than screens built independently?

Perform one deliberate remediation pass after review.
Do not perform endless pixel churn.

## 9. Test / CI / verification requirements

Before completion run:
- gateway tests;
- Android presentation/model unit tests;
- build;
- lint;
- secret scan;
- any signing verification;
- CombinedCode sync check;
- emulator launch/smoke.

Add tests for every new parser/mapping/ordering rule.

If a test is flaky, fix the flakiness rather than retrying until green.

## 10. Documentation and evidence

Write:
docs/claude-runs/2026-09-18_control-tower-8h-hardening_REPORT.md

Update:
- docs/control-tower/RELEASE_STATUS.md
- relevant deployment/signing docs
- portfolio reconciliation only if facts changed

Report:
- starting SHA
- final code SHA
- final docs SHA
- workflow run id
- artifact id/name
- APK size + SHA-256
- signing status/fingerprint
- tests/lint results
- gateway deployment state
- Firebase/push state
- emulator review findings
- remaining Ariel action(s), if any

No secrets in report.

## 11. Stop conditions

Stop a phase early when:
- the requirement is fully evidenced;
- the next step requires external user authentication/approval;
- further work would be speculative;
- the circuit breaker indicates diminishing returns.

Do not stop the entire 8-hour run merely because one phase is externally blocked.
Move to the next independent phase.

Do not spend more than:
- 45 min on Apps Script auth/deployment discovery;
- 45 min on Firebase credential discovery;
- 90 min on signing automation if blocked by external secret setup.

## 12. Exit bar

The run is complete only when all achievable items below are true:

PRODUCT / UX
- dark-soft design remains coherent;
- Hebrew operational language remains clean;
- time wall is robust to real timestamp formats;
- project activity vs control check vs snapshot sync are clearly separate;
- Home supports one-glance control;
- project detail is genuinely useful;
- canonical project coverage is correct;
- no navigation dead ends;
- offline/cached state is clear.

DATA
- header aliases are tested;
- Connections mapping issue is checked/fixed;
- freshness behavior is deterministic and tested;
- v1 fallback remains honest and safe.

RELEASE
- version bumped;
- install/update continuity has been addressed;
- stable signing is implemented if safely achievable;
- CI is green;
- artifact exists and is verified.

OPS
- gateway deployment automation was either completed safely or reduced to the minimum manual step;
- push readiness was advanced without compromising secret safety.

EVIDENCE
- emulator review performed;
- one remediation pass performed;
- report complete;
- Product Gate remains AMBER until Ariel physical-device acceptance.

Do not end with a wishlist.
End with current verified state and the minimum remaining Ariel action, if any.
