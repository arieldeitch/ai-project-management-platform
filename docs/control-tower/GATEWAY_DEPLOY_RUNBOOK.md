# Gateway deploy runbook (Apps Script) — the one manual step

**Why manual:** deploying to the bound Apps Script project requires Ariel's Google session (no `clasp`/Apps Script API
credentials exist on the build machine, and none should be created for this). Everything else is automated.

**How to know whether it is needed** (no token required, takes 2 seconds):

```
node google-apps-script/control-tower-gateway/verify-deployment.mjs
```
- prints `contract_version=5` → gateway 0.10.0 (OS alignment, status taxonomy, ideas planning) is deployed — nothing to do.
  **Current live state (VERIFIED 2026-09-20, token-free probe): `gateway_version=0.10.0 contract_version=5`, with Script
  Properties `OS_CURRENT_VERSION = 1.1.0` and `OS_CURRENT_CHANGE_MARKER = OS-2026-09-19-01`.**
- prints `contract_version=4` → the live activity pipeline works, but the
  app's OS-alignment block, status reasons, short descriptions and idea buckets stay empty/UNKNOWN and drag & drop
  reorder is rejected with "unknown_action". Do the 3-minute step below.
- prints `contract_version=2` or `3` → also the time wall still follows the curated cell. Same step.

## The step (≈ 3 minutes, same URL, same token)

1. Open **PROJECT_CONTROL_BOARD** → **Extensions → Apps Script**.
2. In the editor, select all of `Code.gs` and replace it with the full content of
   `google-apps-script/control-tower-gateway/CombinedCode.gs` from this repo (raw file on GitHub → Ctrl+A, Ctrl+C).
   If the project still has the separate `Config.gs`, `Portfolio.gs`, … files from an earlier paste, delete them first so
   nothing is defined twice.
3. **Deploy → Manage deployments → ✎ (edit) → Version: New version → Deploy.** Do **not** create a new deployment;
   editing the existing one keeps the URL the app already carries.
4. Run the verifier again — it must print `contract_version=5` and exit 0.

Nothing else changes: `GATEWAY_TOKEN`, `FCM_SERVICE_ACCOUNT_JSON`, `GITHUB_READ_TOKEN` and the scanner trigger survive redeployment.

## Once per OS change: the canonical OS marker (0.10.0)

The gateway decides CURRENT / VERSION_DRIFT by comparing a project's receipt with **Script Properties**
`OS_CURRENT_CHANGE_MARKER` (current canonical value: `OS-2026-09-19-01`) and
`OS_CURRENT_VERSION` (current canonical value: `1.1.0`). Apps Script → Project Settings → Script properties → add both. Until they exist every
receipt resolves to UNKNOWN (truthful) and `health.os.os_current_marker_configured` is `false`. Update the marker whenever
the OS changes; nothing else needs redeploying. Projects record receipts with `scripts/control-tower/os-receipt.mjs`
(protocol: `docs/control-tower/OS_ALIGNMENT_RECEIPT_PROTOCOL.md`).

## Only if `health` says `activity_github_token_configured: false`

Four of the five GitHub sources (ariel-habit-ai, child-s-day, personal-news-radar, chief-of-staff) are **private**; GitHub
answers 404 to the anonymous poller, so those projects fall back to the curated cell. One-time: GitHub → Settings →
Developer settings → Fine-grained tokens → "Control Tower read" → repository access: those four repos → permissions
**Metadata: read, Contents: read** (nothing else) → copy → Apps Script → Project Settings → Script properties →
`GITHUB_READ_TOKEN` = *(paste)*. Never put the value in the sheet, a doc, chat or Git. The next 15-minute scan picks it up.

## What CI guarantees before you paste

`CombinedCode.gs` is regenerated from the modular sources and checked in CI (`build-combined.mjs --check`); the mapping
contract has Node tests (`test/portfolio.test.mjs`, `test/activity.test.mjs`, `test/os.test.mjs`, `test/ideas.test.mjs` — 40 in 0.10.0). If CI is green, the file you paste is the file that was tested.
