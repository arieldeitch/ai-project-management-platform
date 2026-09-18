# Control Tower portfolio coverage — reconciliation (2026-09-18)

Scope: Control Tower board (canonical) vs the Chief of Staff project model/fixtures vs "OS Project Registry".
Purpose: make sure the Android client shows the complete canonical top-level portfolio, and that nothing
from a stale fixture is ever presented as live truth.

## Sources inspected

| Source | Where | What it says |
|---|---|---|
| **PROJECT_CONTROL_BOARD** (canonical) | Google Sheet `1EYeDgSd1yMUz7bPbreDlJX130yCay2BMtT_RyQoi2HA`, tab `Projects`; facts as recorded in the task brief (the sheet is in Ariel's account and not readable from this session) | Six top-level rows: P-001 Ariel Life OS, P-002 Household OS, P-003 Personal News Radar, P-004 Tom AI Learning, P-005 Nutrition App, P-006 Chief of Staff |
| Chief of Staff **fixture** | `../chief-of-staff/src/domain/fixtures.ts` (`projects[]`, `capabilities[]`) | projects: Household OS, Nutrition App, **AI Control Tower**, Tom AI Learning, **News Agent**, Chief of Staff. capabilities: AI Control Tower, Household OS, Nutrition App, Tom AI Learning, News Agent, Shopping List Agent, Calendar/Family Schedule Agent, … |
| Chief of Staff **live adapter** | `../chief-of-staff/src/adapters/control-tower.ts` | maps the gateway `portfolio` payload 1:1 (id, name, rag, confidence, needs_ariel, …); no project list of its own. Live acceptance doc expects "P-006 Chief of Staff and the other PROJECT_CONTROL_BOARD projects; fixture projects gone". |
| Chief of Staff **contract snapshot** | `../chief-of-staff/docs/product-source/2026-09-18_CONTROL_TOWER_GATEWAY_CONTRACT.md` | Control Tower owns the project list; CoS must not recreate a registry. |
| **OS Project Registry** | not found in this repository or in the Chief of Staff repository (only references to "do not duplicate the registry") | UNKNOWN — no machine-readable registry exists in either repo. |

## Discrepancy table

| source | project / capability | canonical role | should appear in Control Tower project list? | action taken |
|---|---|---|---|---|
| Board + CoS fixture | Household OS | child project (P-002) | yes | shown; no change |
| Board + CoS fixture | Nutrition App | child project (P-005) | yes | shown; no change |
| Board + CoS fixture | Tom AI Learning | child project (P-004) | yes | shown; no change |
| Board + CoS fixture | Chief of Staff | child project (P-006) | yes | shown; no change |
| **Board only** | **Ariel Life OS** | child project (P-001) | **yes** | Android renders every `role=project` row the gateway returns and never filters by a fixture list, so it cannot be omitted. Unit test `canonicalSixProjectsAreAllPresentAndInfrastructureIsSeparate` asserts it is present. |
| Board only | Personal News Radar | child project (P-003) | yes | shown. Likely the same product the CoS fixture calls "News Agent" (naming drift — see below). |
| **CoS fixture only** | **AI Control Tower** | **infrastructure / capability** (the control system itself) | **no** — not a child project unless the board adds such a row | Gateway now tags any `Projects` row whose name matches "Control Tower" as `role = infrastructure`; Android shows such rows under "תשתית (לא פרויקט)", excluded from counts and urgency. Test `classifies a Control Tower row as infrastructure` + Android test cover it. Today the board has no such row, so nothing is shown. |
| CoS fixture only | News Agent | stale name of P-003 (assumed) | no separate row | no row invented; Personal News Radar (board name) is shown. Naming should be aligned in the CoS fixture, not here. |
| CoS fixture only | Shopping List Agent, Calendar/Family Schedule Agent, Gemini/… | capabilities / runs | no | stay in the Chief of Staff capability area; never added to the portfolio. |

## Decisions applied in code (this repository)

1. The mobile portfolio is the live gateway read of `Projects` — always. There is no fixture in the shipped app.
   The only fixture in this repo is `control-tower-android/tools/review-gateway.mjs`, which is used solely for
   emulator screenshots via an explicit review build flag, labels itself "(fixture)" in `health`, and is
   compiled out of CI builds.
2. Infrastructure rows are separated by the gateway (`role`) and by the client (own section), so Control Tower
   itself can never be counted as a child project.
3. Tests pin the canonical six (by name, including Ariel Life OS) against a live-shaped payload, and pin that
   "AI Control Tower" lands in `infrastructure`.

## What is NOT done here (owned elsewhere)

- The Chief of Staff fixture (`fixtures.ts`) still lists AI Control Tower as a project, lists News Agent, and
  omits Ariel Life OS. That fixture is only used in CoS fixture mode; in live mode CoS reads the same gateway
  and gets the six canonical rows. Aligning the fixture is a Chief of Staff repo change, out of this task's
  scope — recorded here so it is not forgotten.
- No "OS Project Registry" artefact exists to reconcile against; if one is created, it should be derived from
  the board, not the other way round.


## Re-check 2026-09-18 (0.7.0 hardening run)

Facts unchanged. Gateway `role=infrastructure` and the six-name acceptance fixture are re-verified by the 0.7.0 test suites (gateway 12, Android 15). The Chief of Staff fixture discrepancy remains a Chief-of-Staff-repo follow-up; runtime renders live rows only.
