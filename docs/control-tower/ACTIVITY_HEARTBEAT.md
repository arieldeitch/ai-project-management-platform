# Reporting project activity to Control Tower (agent integration)

The OS-wide **Real-Time Project Activity Heartbeat** standard (effective 2026-09-19) is defined in the OS docs; this page
only shows how a project/agent talks to the Control Tower gateway. It does not restate OS truth.

## How Control Tower learns that a project moved

```
ActivitySources  →  explicit heartbeat (immediate)         ┐
                 →  GitHub commits / PRs (≤ 15 min poll)   ├─→ ActivityLedger → effective activity per project
                 →  Drive canonical file modifiedTime      ┘     → last_meaningful_progress in the portfolio contract
                                                                  → the Android time wall (0.7.0 needs no update)
```

Evidence priority: explicit heartbeat › structured run report › GitHub › Drive › curated `Projects.Last Meaningful Progress`.
`Last Control Check` is never project activity. Curated RAG / milestone / next action are never touched by activity.

## 1. Preferred: send a heartbeat (when the gateway token is available to the agent)

```
node scripts/control-tower/heartbeat.mjs --project P-006 --type progress \
  --summary "M2: live read verified against the gateway" \
  --evidence https://github.com/arieldeitch/chief-of-staff/pull/12 --level VERIFIED --id cos-run-42
```

- Token source: `CT_GATEWAY_TOKEN` env var or `~/.config/control-tower/token` — **never** on the command line, in a prompt,
  in a commit or in a log. The script never prints it.
- `--id` (client_event_id) makes the call idempotent: re-running the same run id records nothing new.
- The script always exits 0 unless `--strict`. A failed heartbeat must never block committing/pushing the real work.
- Raw contract (any HTTP client): `POST <gateway>` with JSON
  `{ "token": "…", "action": "activity_heartbeat", "project_id": "P-006", "occurred_at": "2026-09-19T05:07:00Z",
    "activity_type": "progress|checkpoint|report", "summary": "…", "evidence_url": "https://…",
    "evidence_level": "REPORTED|OBSERVED|VERIFIED", "client_event_id": "run-42", "metadata": { … } }`
  → `{ ok, recorded, duplicate, event_id, occurred_at }`. `project_id` must exist in Projects/ActivitySources; sizes are capped;
  sheet names, ranges and file ids are never accepted.

## 2. Fallback A: commit / push + run report

Any push to a configured repository branch (`ActivitySources.locator`) is observed within the 15-minute scanner cycle as
`github_commit:<repo>:<sha>`; PR merges as `github_pr:<repo>:<n>:<merged_at>`. Write a normal, descriptive commit message
(`feat: …`, `fix: …`, `docs: run report …`) — mechanical "refresh/feed/snapshot" messages are classified as automation and
count as activity only for projects whose source has `include_automation = TRUE`.

## 3. Fallback B: canonical Drive workboard / report

For projects observed through `drive_file` (e.g. Tom AI Learning → ACTIVE_WORKBOARD), saving the canonical file is
enough: the new `modifiedTime` is recorded as `drive_file:<fileId>:<modifiedTime>` with activity type `report`.

## Checking what Control Tower sees

`health` → `activity_last_scan_at`, `activity_scan_status`, `activity_source_failures`, `activity_ledger_latest_at`.
`project_activity` (`{ "action": "project_activity", "project_id": "P-006", "limit": 20 }`) lists the ledger for one project.
`portfolio` rows carry `activity_origin` (heartbeat | run_report | github | drive | automation | curated_board | none),
`selected_activity_*`, and `curated_last_meaningful_progress` next to the effective `last_meaningful_progress`.
