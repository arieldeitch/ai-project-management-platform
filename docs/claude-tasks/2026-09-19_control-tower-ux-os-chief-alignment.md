# Control Tower — UX consolidation + OS alignment + Chief of Staff integration

Date: 2026-09-19
Owner: Control Tower
Approved by: Ariel
Canonical implementation repo: `arieldeitch/ai-project-management-platform`
Canonical implementation branch: `control-tower-apk-build`
Related repo: `arieldeitch/chief-of-staff`

## North Star
Ariel opens Control Tower and understands the portfolio in seconds. The default view is compact and calm; details appear on demand. Every managed app has visible OS-alignment status. Chief of Staff consumes the same evidence and translates it into simple Ariel-facing actions.

## Hard communication invariant
All Ariel-facing communication is Hebrew by default.
Technical data/identifiers may remain English when needed, but never make Ariel decode developer jargon to know what to do.

Ariel uses vibe coding. Main output is always:
- what is wrong / what changed;
- why it matters;
- what should happen next;
- which agent/system should handle it.

Keep CI/test/dogfood/log/file-level diagnostics as evidence/detail only.

## Product feedback to implement

### 1. Home — remove information overload
- Remove/relocate the English information blocks Ariel does not read.
- Home should show only high-signal portfolio state.
- Technical/debug/explanatory information belongs in detail/diagnostics.

### 2. Version / branch / freshness identity
Where relevant, show compactly:
- installed app version;
- latest available/current build version;
- branch/ref;
- short commit;
- build/update time.
Clearly distinguish “installed on this device” from “latest available/current repository/build”.
Do not expose meaningless raw identifiers without a human label.

### 3. Idea repository
- Make the ideas surface materially more compact.
- At-a-glance row/card shows only high-level topic/state.
- Full description/details open only on tap.
- Support drag-and-drop ordering for explicit priority/order: now → next → later.
- Preserve manual ordering reliably.
- Improve visual design: current black + blue combination is not pleasant. Use a calmer, softer palette with good contrast.
- Refresh must feel fast: prefer background refresh, local/optimistic update and non-blocking sync where safe.
- No visible waiting spinner for routine reorder/edit if local state can update first.

### 4. Project list / project detail
- Apply progressive disclosure across the app.
- Project list is dense/compact.
- Project detail is also compact by default; secondary detail is collapsible/on-demand.
- Avoid large empty surfaces and repeated explanatory text.

### 5. Home status filters
- Status chips/cards on Home must be tappable filters (e.g. טיפול / ממתין / חסום / etc.).
- Filtering state must be obvious and easy to clear.
- Define the meaning and deterministic rule for every status.
- Provide a short human explanation of why a project currently has that status.
- Status must never feel arbitrary.

### 6. Optional short project description
Add an optional very short free-text purpose/description, e.g.:
“Momentum OS — אפליקציית ניהול בית”.
This short description belongs in compact project displays.
Full project detail remains behind open/tap.

### 7. Deputy output quality
The Deputy currently returns duplicates, noise and technical content.
Implement dedupe and a human-level action model.
Primary deputy item = problem/change + impact + next action + owner/agent.
Do not surface dogfood/CI/test-suite/internal-file terminology as Ariel’s task.
Keep evidence available on demand.

### 8. Control Tower ↔ Chief of Staff integration
Strengthen the integration rather than create a second registry.
Control Tower remains owner of evidence-backed project truth.
Chief of Staff consumes and prioritizes it.

Extend/verify the contract so Chief of Staff can receive, per project when available:
- concise optional short description;
- RAG/status + human explanation;
- latest observed activity;
- meaningful-progress time separately;
- exact Needs Ariel action;
- OS alignment state;
- last OS check;
- OS version/change marker seen;
- OS alignment evidence;
- required sync action;
- version/build identity fields where relevant.

### 9. OS alignment — first-class portfolio control
Every managed app/project must be able to prove it checked the canonical OS on a substantial run.
Control Tower must display per project:
- CURRENT;
- VERSION_DRIFT;
- NEVER_SEEN;
- ACCESS_FAILED;
- UNKNOWN.
Also show last check time and evidence when available.

Do not conflate:
- project activity;
- meaningful progress;
- Control Tower supervisory check;
- OS check;
- app snapshot sync.

Do not mark CURRENT from repository activity alone.
Use OS Access Receipt/equivalent verified evidence.

If existing OS receipt infrastructure is incomplete, implement the smallest compatible path in the Control Tower gateway/board/contracts without creating a competing OS database or weakening permissions.

## Architecture / source-of-truth boundaries
- Google Drive / PROJECT_CONTROL_BOARD remains canonical portfolio state.
- Existing ActivitySources / ActivityLedger remain the activity stream.
- OS Brain / canonical Drive OS owns shared rules.
- Control Tower owns portfolio status + OS-alignment visibility.
- Chief of Staff owns Ariel-facing prioritization/action translation.
- Child projects own implementation/domain truth.
- No new Supabase/backend merely for this task.
- Do not change authentication, sharing, RLS, credentials, or publication model without a real blocker and explicit need.

## Work across both repositories
This run may modify both:
1. `arieldeitch/ai-project-management-platform` — branch `control-tower-apk-build`
2. `arieldeitch/chief-of-staff` — default branch `main`

Work sequentially, never concurrently in the same repo. Keep each repo clean and commit/push its own changes.
Before editing each repo: fetch, verify HEAD/branch, pull/fast-forward safely, inspect current task/state and existing tests.

For Chief of Staff:
- update the Control Tower integration contract and parser/model only as needed;
- consume OS-alignment fields from Control Tower, do not create a second alignment registry;
- translate drift into concise Hebrew action;
- preserve Android-first product boundary;
- keep technical evidence behind detail.

## Required discovery before code
- Inspect current Control Tower version, current APK/build identity and latest branch commits.
- Inspect current gateway contract/version.
- Inspect existing idea/project/deputy/Home implementations; do not duplicate a parallel screen/model.
- Inspect Chief of Staff current contract and current APK state.
- Reconcile names/status taxonomy against canonical board and existing app behavior.

## Testing / verification
Add/update deterministic tests for at least:
- Home filter behavior;
- status rule/explanation mapping;
- compact summary/detail separation;
- idea manual ordering persistence;
- optimistic/background idea refresh behavior;
- deputy dedupe and human-level summary;
- Hebrew user-facing core surfaces;
- OS alignment states and evidence rules;
- no CURRENT from generic repo activity;
- Chief of Staff contract compatibility;
- version/build identity mapping;
- backward compatibility for existing gateway/mobile clients where required.

Run all existing repo quality gates plus relevant Android build/lint/tests/secret scan.
Preserve release signing/update-over continuity.

## Visual acceptance
Use emulator/screenshots if available.
Review at minimum Home, Projects, Project Detail, Ideas, Deputy and OS-alignment presentation.
Target: compact, calm, readable RTL; no technical clutter; no harsh black/blue combination; details on demand.
Do one focused remediation pass after visual review.

## Release / artifact
If Control Tower Android code changes, bump version appropriately from the actual current repo version (do not guess the next number before inspection).
Produce a fresh GitHub Actions APK artifact if required.
Report clearly whether Ariel needs to install a new APK.

If Chief of Staff Android code changes, apply the same discipline in its repo and produce a new artifact only if a build is actually required.

## Documentation
At end, update current-state/release docs and write:
- Control Tower run report under `docs/claude-runs/`;
- Chief of Staff run report under its `docs/claude-runs/` if that repo changed;
- exact commit SHAs;
- workflow run IDs;
- artifact names/IDs;
- gateway/contract version;
- OS alignment contract status;
- remaining Ariel action, if any, in plain Hebrew and without implementation jargon.

## Autonomy / duration
Ariel authorizes a long autonomous run (up to ~12 hours if useful).
Do not stop for routine technical approvals.
Use bounded independent review/remediation loops; do not churn.
If a true external/manual blocker appears, continue all unblocked work and leave the smallest possible Ariel action at the end.

## Exit bar
Engineering GREEN only when:
- accumulated UX feedback above is implemented or explicitly evidenced as already satisfied;
- OS alignment is visible and evidence-backed;
- Chief of Staff consumes the strengthened contract without duplicating truth;
- core Ariel-facing communication is Hebrew;
- Deputy output is deduped and human-level;
- status filters/rules are clear;
- ideas/projects use compact progressive disclosure;
- required tests/builds are green;
- no secrets leaked;
- docs/run reports/commits are pushed.

Product remains USER TEST REQUIRED until Ariel validates the new phone build(s).


## Phase 10 — OS-alignment rollout across all managed apps/projects

Ariel explicitly authorized this run to make the connected portfolio consistently managed through Control Tower, not only to change Control Tower and Chief of Staff.

After the Control Tower + Chief of Staff contract is stable, perform a bounded rollout across every active project currently registered in PROJECT_CONTROL_BOARD (currently P-001..P-006), using each project's actual source-of-truth/access path.

For each project:
1. identify its canonical repo/Drive source from ActivitySources / Projects / existing mappings;
2. inspect whether its run-start instructions already require checking the canonical AI OS and leaving an OS Access Receipt/equivalent evidence;
3. if a repository is directly writable with existing credentials, add the smallest repo-local pointer/instruction needed so the execution agent checks OS at substantial run start and emits evidence; do not copy/fork the OS itself;
4. do not change product code merely to satisfy governance unless the project itself needs an in-app integration;
5. if the source is Drive-only or not writable from this environment, generate the exact migration/handoff artifact and leave the portfolio state truthfully UNKNOWN/NEVER_SEEN/ACCESS_FAILED as appropriate;
6. never mark CURRENT without evidence from the project after the rule is actually consumed;
7. preserve each project's product/architecture/permission boundaries;
8. commit/push each repo separately and sequentially; never create concurrent same-repo work.

Produce a rollout matrix:
project_id | project | canonical source | OS check mechanism | evidence path | alignment after run | exact next action.

The goal is not to force all rows green artificially; it is to make every active app observable and governed so Control Tower can tell Ariel which apps are aligned and which still require one future project run to acknowledge the current OS.
