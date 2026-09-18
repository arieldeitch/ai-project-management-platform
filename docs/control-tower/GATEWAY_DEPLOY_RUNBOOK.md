# Gateway deploy runbook (Apps Script) — the one manual step

**Why manual:** deploying to the bound Apps Script project requires Ariel's Google session (no `clasp`/Apps Script API
credentials exist on the build machine, and none should be created for this). Everything else is automated.

**How to know whether it is needed** (no token required, takes 2 seconds):

```
node google-apps-script/control-tower-gateway/verify-deployment.mjs
```
- exit 0 → deployed gateway is contract v2 or newer — nothing to do.
- exit 1 → the deployed gateway is still v1 (pre-0.7): the app shows "אין חותמת פעילות עדכנית" on every project and the
  Activity tab says the gateway is old. Do the 3-minute step below.

## The step (≈ 3 minutes, same URL, same token)

1. Open **PROJECT_CONTROL_BOARD** → **Extensions → Apps Script**.
2. In the editor, select all of `Code.gs` and replace it with the full content of
   `google-apps-script/control-tower-gateway/CombinedCode.gs` from this repo (raw file on GitHub → Ctrl+A, Ctrl+C).
   If the project still has the separate `Config.gs`, `Portfolio.gs`, … files from an earlier paste, delete them first so
   nothing is defined twice.
3. **Deploy → Manage deployments → ✎ (edit) → Version: New version → Deploy.** Do **not** create a new deployment;
   editing the existing one keeps the URL the app already carries.
4. Run the verifier again — it must print `contract_version=2` and exit 0.

Nothing else changes: `GATEWAY_TOKEN`, `FCM_SERVICE_ACCOUNT_JSON` and the scanner trigger survive redeployment.

## What CI guarantees before you paste

`CombinedCode.gs` is regenerated from the modular sources and checked in CI (`build-combined.mjs --check`); the mapping
contract has Node tests (`test/portfolio.test.mjs`). If CI is green, the file you paste is the file that was tested.
