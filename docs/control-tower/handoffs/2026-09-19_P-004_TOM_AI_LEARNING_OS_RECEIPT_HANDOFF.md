# Handoff — P-004 Tom AI Learning: OS Access Receipt (Drive-only project)

**Why this file exists.** P-004 has no GitHub repository; its canonical source is the Drive `ACTIVE_WORKBOARD`
(ActivitySources row for P-004). Control Tower cannot add a run instruction to a repo, so the instruction is handed off
here for whoever runs the project (ChatGPT / Claude session working from the Drive workboard).

## What the project runner does at the start of every substantial run
1. Open the canonical OS entry point: Drive `AI Projects/00_AI_Operating_System/AI_OS_START_HERE`; note the current
   OS version and the change marker (`CURRENT_OS_VERSION`).
2. Record the receipt to Control Tower — token from the environment only:
   ```
   node <ai-project-management-platform>/scripts/control-tower/os-receipt.mjs --project P-004 \
        --marker <OS change marker read> --version <OS version> --evidence <Drive URL of this run's report / workboard entry>
   ```
   If the OS could not be opened: `--access-failed --notes "<why>"`.
3. No token on the machine → nothing is sent; write "OS sync not re-verified" on the workboard entry.
   Do not edit the board's OS columns by hand and do not describe the project as aligned.

## Truth today (2026-09-19)
- Board state for P-004: as entered by Ariel (`UNKNOWN`), unchanged by this run — no receipt exists yet.
- Nothing in this handoff makes P-004 `CURRENT`; only a receipt whose marker equals the canonical marker will.

## Pointer
Protocol: `docs/control-tower/OS_ALIGNMENT_RECEIPT_PROTOCOL.md` (this repository).
