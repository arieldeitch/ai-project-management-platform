# OS Alignment Receipt Protocol (Control Tower ↔ every project)

**Status:** binding from 2026-09-19 · gateway 0.10.0 / contract 5 · board columns `OS Alignment`, `Last OS Check`,
`OS Version Seen`, `OS Change Marker`, `OS Evidence`, `OS Sync Action`.

## The rule in one paragraph
Control Tower is the **evidence owner** of "is this project aligned with the canonical Ariel AI Operating System".
The canonical OS (Drive `AI Projects/00_AI_Operating_System`, `CURRENT_OS_VERSION` / change marker) is the **rule
owner**. A project is `CURRENT` only when it has *read* the current OS version and *told Control Tower so* with an
**OS Access Receipt**. Nothing else counts: not a commit, not a push, not a merged PR, not a Control Tower check,
not "the agent said so" in chat. Until a receipt exists the board keeps `UNKNOWN` / `NEVER_SEEN` truthfully.

## Five clocks, never merged
| clock | column | who writes it |
|---|---|---|
| project activity | `latest_activity_at` (ledger) | GitHub/Drive observers, heartbeats |
| meaningful progress | `Last Meaningful Progress` (effective) | ledger evidence priority |
| Control Tower check | `Last Control Check` | Control Tower |
| **OS check** | **`Last OS Check`** | **the project's receipt only** |
| app sync | client `synced_at` | the Android app |

## States (computed by the gateway on read)
| state | meaning | how it is reached |
|---|---|---|
| `CURRENT` | read the current OS | receipt whose `os_change_marker` equals Script Property `OS_CURRENT_CHANGE_MARKER` |
| `VERSION_DRIFT` | read an older OS | receipt marker ≠ canonical marker |
| `NEVER_SEEN` | no receipt ever | `Last OS Check` empty and the cell is not an explicit `UNKNOWN` |
| `ACCESS_FAILED` | tried and could not read | receipt with `access_failed: true` |
| `UNKNOWN` | insufficient evidence | explicit cell value, or receipt without marker, or no canonical marker configured |

The Hebrew `OS Sync Action` is generated per state ("להריץ סנכרון OS בפרויקט ולרשום קבלה חדשה" …). Chief of Staff only
translates and prioritises; it never derives a state.

## What every project's run instructions must contain (minimal pointer)
1. At the start of a substantial run: read the canonical OS entry point and note the current version + change marker
   (the repo's `OS_SYNC_POINTER.md` says where; if there is none, `AI Projects/00_AI_Operating_System/AI_OS_START_HERE`).
2. After reading, record the receipt — one command, token from the environment only:
   ```
   node <ai-project-management-platform>/scripts/control-tower/os-receipt.mjs --project P-00X \
        --marker <OS change marker you read> --version <OS version> --evidence <URL of the run report / receipt>
   ```
   If the OS could not be read: `--access-failed --notes "<why>"`.
3. If there is no token on the machine, the script exits 0 and does nothing. Say in the run report
   "OS sync not re-verified"; do **not** edit the board by hand and do not claim alignment.
4. Never copy the OS into the project repository. The pointer is a pointer.

## Canonical marker (Ariel, once per OS change)
Current live values (set 2026-09-20): `OS_CURRENT_VERSION = 1.1.0`, `OS_CURRENT_CHANGE_MARKER = OS-2026-09-19-01`.

Apps Script → Project Settings → Script Properties: `OS_CURRENT_CHANGE_MARKER` (e.g. `OS-2026-09-17`) and optionally
`OS_CURRENT_VERSION` (e.g. `1.1`). Until these exist every receipt resolves to `UNKNOWN` (truthful), and `health.os`
reports `os_current_marker_configured: false`; the Android "מערכת" screen shows the same sentence in Hebrew.

## Where each project points from (rollout 2026-09-19)
See the rollout matrix in `docs/claude-runs/2026-09-19_control-tower-ux-os-chief-alignment_REPORT.md`.
