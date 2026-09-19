# Control Tower 0.8 — Real-Time Project Activity Observability

Date: 2026-09-19
Owner: Control Tower
Trigger: Ariel physical-device feedback
Status: IMPLEMENTED / VERIFICATION IN PROGRESS

## User problem
The app's timestamps are structurally stale because they depend on curated PROJECT_CONTROL_BOARD fields that are updated during later supervisory checks. Ariel needs project activity to reflect what actually happened within minutes, without manually maintaining timestamps.

Verified example: Household OS had current GitHub activity on 2026-09-19 while the board still showed Last Meaningful Progress from 2026-09-16.

## North Star
Control Tower shows the most recently observed real project activity within ~15 minutes for observable sources, while preserving a separate meaningful-progress clock and never confusing automation, supervision, or app sync with product progress.

## Architecture
Curated status truth remains in Projects.
Operational evidence is append-only:
- ActivitySources = source registry
- ActivityLedger = event ledger

Signal priority:
1. direct structured heartbeat;
2. canonical run report / heartbeat;
3. observed GitHub or Drive activity;
4. curated Last Meaningful Progress fallback;
5. Last Control Check is supervision only.

## Sources
Current registered sources:
- P-001 Ariel Life OS → GitHub arieldeitch/ariel-habit-ai
- P-002 Household OS → GitHub arieldeitch/child-s-day
- P-003 Personal News Radar → GitHub arieldeitch/personal-news-radar
- P-004 Tom AI Learning → canonical Drive ACTIVE_WORKBOARD
- P-005 Nutrition App → GitHub arieldeitch/my-elenas-plate
- P-006 Chief of Staff → GitHub arieldeitch/chief-of-staff

## Polling
The existing 15-minute Apps Script scanner polls each GitHub repository through one public GitHub Events API request, catching pushes on feature/PR branches plus PR/review events. Drive sources use last-modified time. Direct heartbeat remains immediate when an agent has ActivityLedger/gateway access.

Automation is typed separately and does not reset meaningful-progress freshness.

## Android
0.8 displays:
- פעילות אחרונה שנצפתה — latest observed event, source and type;
- התקדמות משמעותית — separate freshness clock excluding automation/control checks;
- Control Tower check and app snapshot remain separate clocks.

## Exit bar
- OS heartbeat policy published.
- ActivitySources / ActivityLedger exist and have real backfill.
- gateway contract v3 enriches portfolio with live activity.
- scanner polls sources every 15 minutes.
- GitHub polling uses one efficient Events API call per repo.
- Android clearly separates observed activity and meaningful progress.
- old v1/v2 clients/contracts degrade safely.
- node tests, Android unit tests, build, lint, secret scan and persistent release signing pass.
- Product remains USER TEST REQUIRED until Ariel validates on phone.
