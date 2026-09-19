# Run report — Control Tower UX, OS alignment & Chief of Staff integration (2026-09-19)

**Task:** `docs/claude-tasks/2026-09-19_control-tower-ux-os-chief-alignment.md` + `_ONE_PAGER.md`
**Executor:** Claude Code (Opus 5), autonomous EXECUTION run · **Branch:** `control-tower-apk-build` (platform) · `main` (Chief of Staff, via `claude/ct-os-alignment-consumer-2026-09-19`)
**START_HEAD:** `c4f3f30` (platform) · `abf321f` (chief-of-staff) · **END_HEAD:** see § Commits (the docs commit containing this report is the platform END_HEAD)

## Status in one line
Control Tower 0.10.0 is built, signed and reviewed on the emulator; the gateway 0.10.0 (contract 5) is coded, tested and
waiting for Ariel's one redeploy; Chief of Staff consumes the new contract on `main`; all five repo-backed projects now
carry an OS-receipt run instruction (4 PRs + 1 merged), the Drive-only project has a handoff; **no project was marked
CURRENT** — the board keeps UNKNOWN / NEVER_SEEN truthfully until real receipts arrive. Product gate: USER TEST REQUIRED.

## Commits
| repo | commit | what |
|---|---|---|
| platform | `033a000` | Gateway 0.10.0 / contract 5: `Os.gs` (receipts, verdict, summary), `Portfolio.gs` status taxonomy + short description + OS fields, `Ideas.gs` rewritten (header-name columns, `planning_bucket`/`manual_order`, `reorder_ideas`), `Code.gs` actions `os_receipt`/`reorder_ideas`, health `os`, CombinedCode regenerated, 40 gateway tests |
| platform | `b46d8d2` | Android 0.10.0 (versionCode 11): compact Home + filters + legend, detail collapsibles, OS block, ideas board with drag & drop + optimistic sync, DeputyDigest, BuildIdentity, palette, review fixture v5, 39 unit tests, screenshots |
| platform | (this docs commit) | `scripts/control-tower/os-receipt.mjs`, `OS_ALIGNMENT_RECEIPT_PROTOCOL.md`, P-004 handoff, runbook/verifier (threshold contract ≥ 5), `RELEASE_STATUS.md`, `ACTIVITY_HEARTBEAT.md`, this report |
| chief-of-staff | `46961a7` → `e27025e` → `b5bcebc` → merge `3b1aa8f` on `main` | contract-5 consumer (`os-alignment.ts`, adapter/command/UI), OS receipt pointer, run report `docs/claude-runs/2026-09-19_CONTROL_TOWER_OS_ALIGNMENT_CONSUMER.md`; version bump dropped at merge because `main` had meanwhile received the APK 0.3 task that reserves 0.3.0 / versionCode 3 |

## Tests & gates
| gate | result |
|---|---|
| Gateway Node tests (`portfolio`, `activity`, `os`, `ideas`) | **40 / 40** (`node --test` per file) · `build-combined.mjs --check` in sync |
| Android unit tests | **39 / 39** — `ControlTower010Test` 21 (status rules/reasons, filters, compact title, OS parsing, *fresh git activity never CURRENT*, five clocks, v4 payload compat, ideas sort/move/nudge/payload, deputy dedupe/humanisation/prefix strip/signature, build identity parse + compare) + `PortfolioModelTest` 18 |
| Android lint | 0 errors (23 pre-existing warnings) · debug + release assemble OK |
| APK CI | run **35435862836** ✅ (branch `control-tower-apk-build`, sha `b46d8d2`): artifacts `ControlTower-0.10.0-release` **10581904689** (SHA-256 `c94f0120…49fbe`, signer cert `00151c98…7c7950` = persistent key → installs over 0.7.0/0.9.0), `ControlTower-0.10.0-debug` 10582189566, lint 10581924776, unit-tests 10582420037 |
| Secret scan | clean (no token/keystore material in diff; token only via env/`~/.config/control-tower/token`) |
| Chief of Staff gates | `bun test` **209 / 209**, typecheck clean, eslint 0 errors, `build` + `build:mobile` + `check:mobile` + `check:secrets` OK; `Android APK` workflow on `main` run **35436263925** (in progress at report time — a 0.2.0 rebuild; the Ariel-facing artifact for this work will be the APK 0.3 build) |
| Emulator review | Pixel 7 API 35 with the contract-5 fixture gateway: Home, legend, active filter, Projects, Detail (OS block), Ideas (long-press drag NEXT→NOW persisted as `manual_order` 10/20/30 via `reorder_ideas`), expanded idea, Deputy, Activity — `docs/claude-runs/screenshots/2026-09-19_control-tower-0.10/01…13` |

### Review → remediation (one pass, all fixed, re-verified in screenshots 11–13)
1. Filter chip "לא מיושר ל-OS" rendered its count inside the Latin run ("ל-5 OS") → RLM before the count.
2. Detail repeated the same sentence twice (status reason == "מה צריך ממך") → reason line suppressed when it repeats the action.
3. Version identity said "זו הגרסה המותקנת" when the device build (11) was *newer* than the latest CI build (10) → three explicit outcomes.
4. Deputy report headline repeated the project name ("דיווח על Tom AI Learning: Tom AI Learning: …") and "ממתינה לבדיקה בטלפון" was not classified as Ariel's user test → prefix strip + pattern; now "גרסה מחכה לבדיקה שלך ב-Tom AI Learning · אריאל".

## Versions
| component | before | after |
|---|---|---|
| Android | 0.9.0 (10) | **0.10.0 (11)**, `BuildConfig.GIT_REF` / `BUILD_TIME` from CI |
| Gateway (repo) | 0.9.0 / contract 4 | **0.10.0 / contract 5** |
| Gateway (deployed, token-free probe 12:55 IDT) | 0.7.0 / contract 2 (last report) | **0.9.0 / contract 4** — Ariel redeployed 0.9.0 in between; 0.10.0 still needs the one redeploy |
| Chief of Staff | 0.2.0 (2), contract read fields v1 | 0.2.0 (2) on `main` with contract-5 consumer; APK 0.3.0 reserved by the parallel task |

## OS alignment — what changed and what did not
- Board columns (already added by Ariel) are read, normalised and *evaluated on read*: CURRENT only when a receipt's marker equals Script Property `OS_CURRENT_CHANGE_MARKER`; NEVER_SEEN when no check; explicit UNKNOWN respected; ACCESS_FAILED kept; VERSION_DRIFT otherwise. Hebrew `os_sync_action` generated per state.
- `os_receipt` writes only the six OS columns (validated: project id, not-future check time, marker + evidence required unless access failed).
- **No board cell was changed by this run.** All six projects remain exactly as Ariel entered them (UNKNOWN). The Android/Chief UIs show that truthfully ("OS לא ידוע").
- Five clocks kept apart end-to-end (ledger activity, meaningful progress, Control Tower check, OS check, app sync) — asserted by tests on both sides.

## Rollout matrix (P-001 … P-006)
| project_id | project | canonical source | OS check mechanism added | evidence path | alignment after run | next action |
|---|---|---|---|---|---|---|
| P-001 | Ariel Life OS | `arieldeitch/ariel-habit-ai` (private; `main` = init commit, work on the V7 stack) | `OS_ALIGNMENT_RECEIPT.md` + CLAUDE.md section — PR [#19](https://github.com/arieldeitch/ariel-habit-ai/pull/19) → `claude/v7-3-quiet-exit` | receipt evidence = run-report URL, sent by `os-receipt.mjs --project P-001` | UNKNOWN (unchanged; no receipt yet) | merge PR #19; first run records a receipt |
| P-002 | Household OS | `arieldeitch/child-s-day` (private, PR-to-main workflow) | `OS_ALIGNMENT_RECEIPT.md` + CLAUDE.md session-start bullet — PR [#57](https://github.com/arieldeitch/child-s-day/pull/57) → `main` | same | UNKNOWN (unchanged) | merge PR #57; next Claude run records a receipt |
| P-003 | Personal News Radar | `arieldeitch/personal-news-radar` (private; already has `OS_SYNC_POINTER.md` v1.1 verified 2026-09-18) | `OS_ALIGNMENT_RECEIPT.md` + `STARTUP_CHECKLIST.md` step 1 — PR [#1](https://github.com/arieldeitch/personal-news-radar/pull/1) → `main` | same (marker from `OS_SYNC_POINTER.md`) | UNKNOWN (unchanged) — note: the pointer says OS 1.1 was read on 2026-09-18, but no receipt exists, so it is *not* CURRENT | merge PR #1; re-run the checklist once to emit the first receipt |
| P-004 | Tom AI Learning | Drive `ACTIVE_WORKBOARD` only (no repo) | handoff artifact `docs/control-tower/handoffs/2026-09-19_P-004_TOM_AI_LEARNING_OS_RECEIPT_HANDOFF.md` | Drive URL of the workboard entry / run report | UNKNOWN (unchanged) | the project runner follows the handoff at the next session |
| P-005 | Nutrition App | `arieldeitch/my-elenas-plate` (public, Lovable-connected) | `OS_ALIGNMENT_RECEIPT.md` + AGENTS.md section — PR [#1](https://github.com/arieldeitch/my-elenas-plate/pull/1) → `main` | same | UNKNOWN (unchanged) | merge PR #1 (no history rewrite) |
| P-006 | Chief of Staff | `arieldeitch/chief-of-staff` (private) | `OS_ALIGNMENT_RECEIPT.md` + CLAUDE.md line — **merged to `main`** (`3b1aa8f`) | same | UNKNOWN (unchanged) | next Chief run records the first receipt |

Summary: **0 of 6 aligned (CURRENT), 6 awaiting proof** — by design. Alignment can only change when (a) the gateway is
redeployed at 0.10.0, (b) `OS_CURRENT_CHANGE_MARKER` is set, and (c) a project run sends a receipt.

## Control Tower ↔ Chief of Staff
- Contract doc (already extended 2026-09-19) is now implemented on both sides: CT emits `short_description`, `status_bucket`/`status_reason`, `latest_activity_at`/`latest_meaningful_activity_at`, `os_*`, `contract_version 5`; Chief parses them (`ctProjectSchema` extended with defaults), translates drift ("Momentum OS עדיין לא קראה את עדכון מערכת ההפעלה האחרון" → "נדרשת ריצת סנכרון בפרויקט ורישום קבלת OS חדשה" · owner סוכן הפרויקט (Claude Code)), surfaces it as an agent-owned execution row (מחר), never as Ariel's decision, and shows the OS section in project detail. No second registry; no JSON to Ariel.
- Backward compatibility: Chief tests cover v1 array envelope, v4 rows without new fields and v5 rows; Android tests cover a v4 payload.

## Verified vs USER TEST REQUIRED
- **Verified (engineering):** everything in § Tests & gates; drag & drop persistence against the fixture gateway; signed artifact identity; deployed gateway = 0.9.0/4 (probe).
- **USER TEST REQUIRED (Ariel, on the phone):** clarity/usefulness of the compact Home and filters, the ideas board with real ideas, the deputy digest on real inbox rows, the OS block once the gateway is redeployed. Chief of Staff on the phone: with the APK 0.3 build.
- **NOT verified:** push sending (unchanged); OS receipts from real projects (none exist yet).

## External blockers / Ariel's actions (in order)
1. Redeploy the gateway once (`docs/control-tower/GATEWAY_DEPLOY_RUNBOOK.md`, ~3 min) and add Script Property `OS_CURRENT_CHANGE_MARKER` (+ optional `OS_CURRENT_VERSION`).
2. Install `ControlTower-0.10.0-release.apk` (artifact 10581904689) over the current build.
3. Merge the four docs-only PRs (ariel-habit-ai #19, child-s-day #57, personal-news-radar #1, my-elenas-plate #1).

## Invariants respected
No auth/ownership/sharing/OAuth/secrets/RLS/approval/publication changes · no tokens requested or printed · no OS copied into any repo · no force-push · each repo committed and pushed separately · no board cell edited · Supabase not recreated · gateway URL/token unchanged.
