# Control Tower — Live Project Activity Pipeline

Date: 2026-09-19
Owner: Control Tower
Branch: control-tower-apk-build
Priority: P0 product truth / freshness
Starting product state: 0.7.0 installed candidate, gateway contract v2 deployed by Ariel

## User problem

Ariel reports that project update timestamps are still continuously behind real activity. The UI is better, but the freshness model is still wrong at the source.

Root cause:
- Android correctly distinguishes project activity vs Control Tower check vs snapshot sync.
- But gateway currently derives project activity primarily from Projects.Last Meaningful Progress.
- That field is curated and can lag actual execution by hours/days.
- PROJECT_CONTROL_BOARD now contains:
  - ActivitySources
  - ActivityLedger
- OS-wide Real-Time Project Activity Heartbeat standard is effective 2026-09-19.
- ActivityLedger already contains observed events from GitHub/Drive showing fresher activity than Projects.Last Meaningful Progress.

Example already observed:
- Household OS board Last Meaningful Progress was 2026-09-16 12:25 while GitHub PR #45 merged 2026-09-19T04:27:36Z.
This is unacceptable for a daily Control Tower.

## North Star

Within ~15 minutes of real repository/Drive activity — and immediately when an explicit heartbeat is available — Control Tower should show the latest real project activity time and source without Ariel manually updating PROJECT_CONTROL_BOARD.

Curated status/milestone/next action remain separate and authoritative.

## Canonical source priority

For each project, latest activity must be selected by evidence priority:
1. explicit structured heartbeat in ActivityLedger;
2. structured run report/heartbeat in canonical source;
3. observed GitHub commit/PR activity;
4. Drive canonical file modification;
5. curated Projects.Last Meaningful Progress;
6. never use Last Control Check as project activity.

Important: newest timestamp does NOT always outrank higher-quality heartbeat if the lower-quality item is automation noise. Use activity_type/include_automation rules.

## Existing Sheet schema

ActivitySources:
project_id, project_name, source_type, locator, branch, include_automation, enabled, last_poll_at, last_seen_at, notes

ActivityLedger:
event_id, occurred_at, observed_at, project_id, project_name, source_type, source_locator, activity_type, summary, evidence_url, evidence_level, metadata_json

Current configured sources:
- P-001 Ariel Life OS -> github_repo arieldeitch/ariel-habit-ai main
- P-002 Household OS -> github_repo arieldeitch/child-s-day main
- P-003 Personal News Radar -> github_repo arieldeitch/personal-news-radar main, include_automation TRUE
- P-004 Tom AI Learning -> drive_file canonical ACTIVE_WORKBOARD
- P-005 Nutrition App -> github_repo arieldeitch/my-elenas-plate main
- P-006 Chief of Staff -> github_repo arieldeitch/chief-of-staff main

## Phase A — Gateway reads ActivityLedger

Add a bounded read model that derives, per project:
- latest_observed_activity_at
- latest_observed_activity_type
- latest_observed_activity_summary
- latest_observed_activity_source_type
- latest_observed_activity_evidence_url
- latest_observed_activity_evidence_level

Then expose these in portfolio contract v3 while preserving v1/v2 fields.

For backwards compatibility:
- last_meaningful_progress should be the selected effective project activity timestamp used by existing Android 0.7 clients.
- last_meaningful_progress_raw should remain meaningful evidence text when curated fallback is used.
- add an explicit activity_origin / selected_activity_source field so newer clients can explain why the clock moved.

Selection rules:
- explicit heartbeat/progress/checkpoint/report events are meaningful;
- control_check never counts;
- automation only counts as project activity if ActivitySources.include_automation is true;
- repetitive scheduled refreshes must not continuously make a development project look active;
- if no valid ledger event exists, fall back to Projects.Last Meaningful Progress;
- never fall back to Last Control Check.

## Phase B — Native source poller in Apps Script

Implement ActivitySources polling as Apps Script, time-boxed and rate-conscious.

### GitHub public repo adapter
For enabled github_repo sources:
- inspect configured branch;
- observe recent commits;
- observe meaningful PR activity/merge when practical;
- stable event IDs:
  - github_commit:<repo>:<sha>
  - github_pr:<repo>:<number>:<meaningful-event-timestamp>
- append only unseen events.
- evidence URL required.
- occurred_at = actual GitHub timestamp, observed_at = scan time.
- update ActivitySources.last_poll_at and last_seen_at.

Automation filtering:
- if include_automation is FALSE, skip clearly mechanical/scheduled refresh commits and bot-generated routine updates when detectable.
- do not over-filter legitimate Claude/AI implementation commits.
- if include_automation TRUE, write activity_type=automation for routine generated feed refresh and progress for meaningful code/product commits when deterministically distinguishable.
- conservative classification is preferred over false precision.

Rate limits:
- no GitHub token dependency for the current public repos.
- minimize calls; ETag/If-Modified-Since or last-seen bounded fetch if practical.
- 15-minute scan across six sources must remain comfortably under anonymous GitHub API limits.
- if rate-limited, record poll failure safely and preserve prior data.

### Drive file adapter
For drive_file:
- read exact configured file metadata modification timestamp.
- append a new event only when modifiedTime advances.
- event ID = drive_file:<fileId>:<modifiedTime>.
- activity_type=report unless a stronger deterministic classification exists.
- evidence URL required.

## Phase C — Trigger lifecycle

Integrate activity polling into the existing 15-minute scanner lifecycle.

Preferred:
- one idempotent trigger.
- each scheduled scan first reconciles ActivitySources/ActivityLedger, then evaluates high-signal push transitions.
- preserve existing scanner trigger if possible rather than creating parallel uncontrolled triggers.

Add health fields:
- activity_sources_enabled
- activity_last_scan_at
- activity_scan_status
- activity_source_failures (bounded / no secrets)
- activity_ledger_latest_at

Do not fail portfolio reads merely because one external source poll failed.

## Phase D — Direct heartbeat endpoint

Add an authenticated append-only action to the existing gateway, e.g. activity_heartbeat.

Payload minimum:
- project_id
- occurred_at
- activity_type
- summary
- evidence_url/ref optional
- evidence_level
- metadata optional, bounded

Security:
- use existing owner authentication for now unless there is a compelling safe reason for a separate reporter token.
- never accept spreadsheet IDs, sheet names or arbitrary ranges.
- validate project_id against Projects / ActivitySources.
- strict field size limits.
- no secrets in payload/logs.
- stable/deterministic dedupe id or client_event_id support.

This action exists so GPT/Gemini/Claude agents with safe gateway access can report immediately rather than waiting for GitHub fallback.

## Phase E — OS / agent reporting contract

Do NOT duplicate OS truth in project docs.
The OS already mandates the Real-Time Project Activity Heartbeat invariant.

Add a small repo-side integration doc/helper showing agents how to emit a heartbeat when credentials are available, and how to fall back to:
- commit/push + run report
- canonical Drive workboard/report

Important:
- no token in prompt examples;
- helper reads token from environment/local secret only;
- sending heartbeat failure must never block committing/pushing the actual project work.

## Phase F — Android compatibility / optional enhancement

0.7.0 must benefit WITHOUT requiring a new app build:
- effective last_meaningful_progress from gateway/ledger must feed the existing time wall.

If low-risk, add contract-v3 parsing fields in Android and show a subtle source line in detail:
- "מקור פעילות: GitHub commit / PR / heartbeat / Drive"
- evidence link if useful.

Do not clutter Home cards unless user value is obvious.

If Android code changes, bump version to 0.8.0 and preserve persistent release signing/update-over continuity.

## Phase G — Current data reconciliation

During verification:
- compare all six Projects.Last Meaningful Progress values against ActivityLedger latest meaningful events.
- document any material lag.
- do not overwrite curated milestone/status merely because code changed.
- if the gateway effective activity selection is correct, the app should not require Projects timestamps to be manually kept current.

## Tests

Add deterministic tests for:
- ledger event selection precedence;
- automation exclusion/inclusion;
- control_check exclusion;
- fallback to curated Last Meaningful Progress;
- never fallback to Last Control Check;
- event dedupe;
- GitHub commit mapping;
- PR merge mapping;
- Drive modifiedTime mapping;
- one source failure does not break portfolio;
- direct heartbeat validation/dedupe;
- CombinedCode in sync.

No live GitHub dependency in unit tests; use fixtures/mocks.

## Manual deployment

Because Apps Script deployment still requires Ariel's Google session:
- produce regenerated CombinedCode.gs;
- preserve same deployment URL/token;
- update GATEWAY_DEPLOY_RUNBOOK.md with the exact one-time redeploy step.
- minimize Ariel action to paste/deploy once.

## Exit bar

Engineering GREEN only if:
- ActivityLedger is the primary observed-activity feed;
- existing 0.7 client receives current effective activity through last_meaningful_progress;
- GitHub/Drive poller exists and is idempotent;
- scan is on 15-minute trigger path;
- direct heartbeat endpoint exists and is validated;
- tests/build/secret scan green;
- no curated status truth is overwritten;
- source failures degrade safely;
- CombinedCode regenerated.

Product remains AMBER until Ariel sees recent real activity on the physical device after redeploy.

Write:
docs/claude-runs/2026-09-19_control-tower-live-activity-pipeline_REPORT.md

Report exact code SHA, workflow run, gateway contract version, whether an Android update is needed, and the minimum remaining Ariel action.
