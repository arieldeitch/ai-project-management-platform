# Run Report — Control Tower Live Project Activity Pipeline (gateway 0.9.0, contract 4)

**Task:** `docs/claude-tasks/2026-09-19_control-tower-live-activity-pipeline.md` (+ one-pager) · P0 product truth
**Run (Asia/Jerusalem):** 2026-09-19 ~08:10 → 09:05 IDT

## Identity

| | Value |
|---|---|
| Starting SHA | `f671f44` (0.8.0 activity v3 module + task docs; a concurrent `d6e60ec` "idea incubator v0.9" landed mid-run and was rebased under this work) |
| **Final code SHA** | **`56a0be30832d23f07d06588d24169af0cca14cdf`** |
| Final docs SHA | the commit adding this report (`git log -1`) |
| **Workflow run** | **35424223931** — all steps green |
| **Gateway** | version **0.9.0**, **contract 4** (v1/v2/v3 fields preserved) |
| Android artifact from this run | `ControlTower-0.9.0-release` (artifact id 10578401736, `ControlTower-0.9.0-release.apk`, SHA-256 `4304f48360065b1947d0d291f51bdbe00f7e9a7626412f2aa7d6b54f9f1998a0`, persistent cert `00151c98…7c7950`, versionCode 10) — **optional**, see "Is a new APK needed" |
| Tests | gateway 30/30 (portfolio 12, activity 15, ideas 3), Android unit 18/18, lint 0 errors, secret scan clean, `CombinedCode.gs` regenerated and verified in CI |

## The root-cause fix (Phase A)

Before: `enrichPortfolioWithActivity_` added `latest_*` fields but left `last_meaningful_progress` equal to the curated
`Projects.Last Meaningful Progress`. Every shipped client (0.7.0 included) reads `last_meaningful_progress` for its time
wall, so real GitHub/Drive/agent activity never moved the clock.

Now, per project, the gateway selects the **effective activity** from ActivityLedger + the curated cell by evidence
priority and writes it into `last_meaningful_progress`:

| rank | class | source | counts as activity |
|---|---|---|---|
| 5 | `heartbeat` | `source_type` contains "heartbeat" (direct `activity_heartbeat`) | yes |
| 4 | `run_report` | structured report/checkpoint/progress from a non-GitHub/Drive source | yes |
| 3 | `github` | `github_commit`, `github_pr` (progress/checkpoint) | yes |
| 2 | `drive` | `drive_file` modifiedTime | yes |
| 1 | `automation` | mechanical refresh commits (`activity_type=automation`) | **only** if the project's `ActivitySources.include_automation` is TRUE (P-003) |
| 0 | `curated_board` | `Projects.Last Meaningful Progress` | fallback when nothing qualifies, or when strictly newer than every qualifying event |
| — | `control_check` | | **never** (never selected, never a fallback, never `last_check`) |

Rules: newest qualifying evidence wins; equal timestamps → higher class; an explicit heartbeat outranks inferred
GitHub/Drive/automation evidence that is at most 15 minutes newer (same work window); materially newer inferred work
still wins (a commit two hours after a heartbeat is real progress). Curated RAG / lifecycle / milestone / next action /
needs-Ariel are never touched (tested).

Contract additions (all additive): `curated_last_meaningful_progress(+_raw)`, `activity_origin`
(`heartbeat|run_report|github|drive|automation|curated_board|none`), `selected_activity_{at,type,source,summary,evidence_url,evidence_level}`;
`last_meaningful_progress_raw` is kept only when the curated cell was selected, so it still reads as evidence.
`latest_activity_*` (newest of anything, incl. automation) and `latest_meaningful_activity_*` (= the selection) remain for 0.8+ clients.

## Poller (Phases B/C)

- Runs inside the existing 15-minute `scanHighSignalEvents` trigger, before push-transition evaluation; one idempotent trigger.
- GitHub: one **conditional** Events API call per repo per scan (`If-None-Match`; a 304 costs no quota) → 6 sources ≈ 24 calls/h worst case vs the anonymous 60/h limit. Stable ids `github_commit:<repo>:<head sha>` (PushEvent, any branch, branch recorded), `github_pr:<repo>:<number>:<merged_at|ts>` (merge uses `merged_at`), `…:review:<ts>` (checkpoint). Automation detection: bot accounts and `chore(feed|data|refresh|snapshot|digest)` / "refresh|feed|snapshot" messages; ordinary `feat:`/`fix:` commits by humans or AI assistants are progress. Sources with `include_automation=FALSE` never even record automation events.
- Drive: `drive_file:<fileId>:<modifiedTime>`, `activity_type=report`, appended only when `modifiedTime` advances.
- Failure isolation: each source is try/caught; rate limits (`rate_limited`), private/missing repos (`not_found_or_private_repo`) and bad tokens are recorded per source; the scan continues; `ActivitySources.last_poll_at/last_seen_at` are maintained; scan state is persisted (`ACTIVITY_SCAN_STATE`).
- Portfolio reads never fail because of activity tabs (degrade to curated values; tested).
- Health: `activity_sources_enabled`, `activity_last_scan_at`, `activity_scan_status` (ok|partial|failed|never), `activity_source_failures` (bounded, no secrets), `activity_ledger_latest_at`, `activity_github_token_configured` (boolean only).

## Direct heartbeat (Phase D)

`activity_heartbeat` (existing owner token): `project_id` validated against Projects ∪ ActivitySources; `occurred_at` in any accepted timestamp shape (defaults to now, rejects the future); `activity_type ∈ progress|checkpoint|automation|report|control_check`; `summary` required (≤ 800); `evidence_url` http(s) only; `evidence_level ∈ REPORTED|OBSERVED|VERIFIED|CURATED`; metadata ≤ 1500 chars; dedupe by `client_event_id` (`heartbeat:<id>`) or a content digest; append-only; never accepts sheet names, ranges or file ids. Returns `{recorded, duplicate, event_id, occurred_at}`.

## Agent reporting contract (Phase E)

`docs/control-tower/ACTIVITY_HEARTBEAT.md` + `scripts/control-tower/heartbeat.mjs` (token only from `CT_GATEWAY_TOKEN` or `~/.config/control-tower/token`, never printed; always exits 0 unless `--strict`; documents the commit/push and Drive-workboard fallbacks). No OS truth duplicated.

## Android (Phase F) — is a new APK needed?

**No.** 0.7.0 reads `last_meaningful_progress`, which is now the effective activity time — the fix arrives with the gateway redeploy alone. 0.8.0/0.9.0 code (already on the branch from earlier commits) additionally shows the live source label ("GitHub / Google Drive / דיווח סוכן") and the observed-vs-meaningful split; `ControlTower-0.9.0-release` was built and signed in this run and installs over 0.7.0, but it is optional for this task. No Android code was changed in this run.

## Reconciliation of the six sources (Phase G) — live evidence

Observed 2026-09-19 ~08:40 IDT with the authenticated `gh` CLI (read-only) and the anonymous Events API the poller uses:

| project | source | visibility | real latest activity (GitHub `pushedAt` / PR) | curated Last Meaningful Progress | lag before this fix | after redeploy |
|---|---|---|---|---|---|---|
| P-001 Ariel Life OS | `arieldeitch/ariel-habit-ai` | **private** | push 2026-09-18T09:54:16Z | UNKNOWN (sheet not readable here) | — | ≤ 15 min once `GITHUB_READ_TOKEN` is set |
| P-002 Household OS | `arieldeitch/child-s-day` | **private** | PR #45 merged 2026-09-19T04:27:36Z; push 2026-09-19T05:27:55Z | 2026-09-16 12:25 IDT (from the task) | **≈ 2.8 days** | ≤ 15 min (with token) — test "ledger GitHub evidence newer than the curated cell…" reproduces exactly this case |
| P-003 Personal News Radar | `arieldeitch/personal-news-radar` (include_automation) | **private** | push 2026-09-19T05:30:07Z | UNKNOWN | — | ≤ 15 min (with token); automation counts for this project |
| P-004 Tom AI Learning | Drive `ACTIVE_WORKBOARD` | Drive | not observable from this machine | UNKNOWN | — | ≤ 15 min via `modifiedTime` (no token needed; runs as Ariel) |
| P-005 Nutrition App | `arieldeitch/my-elenas-plate` | public | push 2026-09-19T05:30:16Z (Events API answered anonymously, 20 events) | UNKNOWN | — | ≤ 15 min, no token needed |
| P-006 Chief of Staff | `arieldeitch/chief-of-staff` | **private** | push 2026-09-19T05:29:24Z | UNKNOWN | — | ≤ 15 min (with token); immediate via heartbeat |

Material finding: the task's premise "no GitHub token dependency for the current public repos" holds only for
P-005. The other four repos answer **404 to the anonymous poller**, so they fall back to the curated cell unless Script
Property `GITHUB_READ_TOKEN` (fine-grained, read-only Metadata+Contents on those four repos) is present. The ledger
already holding PR #45 (per the task) suggests a token exists; `health.activity_github_token_configured` now tells
the truth without exposing the value. Curated values were not overwritten anywhere; whether Ariel keeps maintaining
`Projects.Last Meaningful Progress` is now optional — the effective clock comes from evidence.

## Deployed state (VERIFIED, token-free probe)

`verify-deployment.mjs` → the live Web App is still **gateway 0.7.0 / contract 2**. The pipeline code is in the repo and
in `CombinedCode.gs`, tested and CI-verified, but **not yet running for Ariel**.

## Files changed

`google-apps-script/control-tower-gateway/{Activity.gs (rewritten), Code.gs, Config.gs (contract 4), CombinedCode.gs (regenerated), verify-deployment.mjs, test/activity.test.mjs (15 tests), test/portfolio.test.mjs}`,
`.github/workflows/control-tower-apk.yml` (runs the activity suite; triggers on `google-apps-script/**`),
`scripts/control-tower/heartbeat.mjs` (new), `docs/control-tower/{ACTIVITY_HEARTBEAT.md (new), GATEWAY_DEPLOY_RUNBOOK.md, RELEASE_STATUS.md}`, this report.

## Gates

Engineering **GREEN** (ledger is the primary observed-activity feed; 0.7 client receives effective activity through `last_meaningful_progress`; poller idempotent on the 15-minute trigger; heartbeat validated; tests/build/scan green; curated truth untouched; failures degrade safely; CombinedCode regenerated).
Product **AMBER** until Ariel sees fresh real activity on the phone after the redeploy.

## Minimum remaining Ariel action

**One Apps Script redeploy** (`docs/control-tower/GATEWAY_DEPLOY_RUNBOOK.md`, ≈3 min, same URL and token): paste the
current `CombinedCode.gs`, *Manage deployments → ✎ → New version → Deploy*. `verify-deployment.mjs` must then print
`contract_version=4`. No app update is required.

Conditional (only if `health` afterwards shows `activity_github_token_configured: false`): add the read-only
`GITHUB_READ_TOKEN` Script Property for the four private repos (runbook section) — otherwise those four projects keep
falling back to the curated cell.
