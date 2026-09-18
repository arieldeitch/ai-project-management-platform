# Control Tower gateway (Google Apps Script)

**PROJECT_CONTROL_BOARD Sheet → this Web App → Android client. FCM = push transport only.**

Files: `appsscript.json`, `Code.gs` (endpoint, auth, action allow-list), `Config.gs` (fixed IDs, tabs, header aliases),
`Portfolio.gs` (read Projects/Connections), `Inbox.gs` (MobileInbox), `Devices.gs` (MobileDevices),
`Push.gs` (FCM v1 sender), `Scanner.gs` (high-signal trigger, push-state dedupe, editor smoke tests).

## Contract

`POST <web-app-url>` with JSON body `{ "token": "...", "action": "...", ...params }`.
Response is always JSON with `ok`, `status` (HTTP-like code carried in the body — Apps Script cannot set real status codes), and on error `error`.

| action | params | returns |
|---|---|---|
| `health` | — | spreadsheet title, tabs, resolved/unresolved Projects columns, active_devices, fcm_configured, scanner_trigger_installed |
| `portfolio` | `include_connections?` | `projects[]` + `snapshot_at` + `contract_version` (2). Each project: id, key, name, **role** (`project` | `infrastructure`), lifecycle, rag, confidence, milestone, **progress_evidence**, next_action, blocker, needs_ariel, ariel_input, **last_meaningful_progress** (ISO) + `_raw`, **last_control_check** (ISO) + `_raw`, `last_check` (= last_control_check, v1 compatibility), **expected_cadence**, link, objective, risk, user_test_required |
| `inbox` | `limit?` | latest MobileInbox rows, newest first |
| `submit_report` | `report_text`, `source` (`share`/`deputy_command`/`manual`), `project_hint?`, `device_id?`, `app_version?` | row appended as **REPORTED** |
| `register_device` | `token`, `device_id?`, `device_label?`, `app_version?` | upsert in MobileDevices |
| `unregister_device` | `token` | row removed |
| `test_push` | — | `{sent, failed, fcm_configured}` — only to registered device rows |
| `activity` | `limit?` | recent push events from MobilePushState |

Anything else → `unknown_action`. Wrong/missing token → `unauthorized` (after a 250 ms delay).

## Contract v2 (0.6.0) — timestamps are distinct

- `last_meaningful_progress` = board column **Last Meaningful Progress** (real project activity).
- `last_control_check` = board column **Last Control Check** (when Control Tower last looked). Never shown as activity.
- `expected_cadence` = board column **Expected Cadence**; the client derives fresh / aging / stale / unknown from it.
- Date cells are emitted as ISO-8601; text cells such as `18/09/2026 14:23` are parsed, unparseable text is kept in `*_raw`.
- `role = infrastructure` for rows whose name matches "Control Tower" (never a child project).
- Every response carries `contract_version`; the Android Activity tab warns when a deployed gateway is still v1.

Old clients keep working: v1 fields are unchanged. **Redeploying is required for the new fields** — paste the regenerated
`CombinedCode.gs` (`node google-apps-script/control-tower-gateway/build-combined.mjs`) and create a new deployment version.

Tests: `node --test google-apps-script/control-tower-gateway/test/portfolio.test.mjs` (mapping, timestamps, cadence, role, override, health, CombinedCode sync).

## Mobile tabs (created idempotently on first use)

- `MobileInbox` — received_at, source, status, evidence_level, report_text, project_hint, device_id, app_version, processed_at, notes
- `MobileDevices` — token, device_id, device_label, platform, app_version, registered_at, last_seen_at, active
- `MobilePushState` — project_key, last_rag, last_needs_ariel, last_lifecycle, last_event, last_event_at, updated_at

They are transport state. `Projects` / `Connections` stay the only portfolio truth and are never written by the gateway.

## Column detection

`Projects` headers are matched by alias (English and Hebrew, see `PROJECT_FIELD_ALIASES`). `health` lists what was
resolved and what was not. To fix a mapping without touching code, set the script property
`PROJECTS_COLUMN_MAP` to e.g. `{"name":"Project Name","needs_ariel":"Needs Ariel?"}`.

## Security model (private single-owner v0.4)

- One high-entropy shared token (`GATEWAY_TOKEN`, ≥ 32 chars) checked with a constant-time digest compare **before any Drive access**.
- Token travels in the POST body, never in the URL. GET returns nothing useful.
- Fixed spreadsheet id, fixed tab names, fixed action list. The client cannot name a file, sheet, range, formula or function.
- Script properties and the service account are never returned.
- Web App runs as the deploying user (Ariel) with access "Anyone" so the phone can call it without a Google sign-in; the token is the only gate.

**Compromise, stated plainly:** a token embedded in a sideloaded APK can be extracted from that APK. That is acceptable for
one owner and one phone, and it is *not* a multi-user auth design. If the phone or the APK leaks, rotate `GATEWAY_TOKEN`
and rebuild. A materially stronger owner-only scheme (Google Sign-In + ID-token verification) needs an OAuth client and
Play-services sign-in in the app; it was deliberately not done in this run.

## Push

`FCM_SERVICE_ACCOUNT_JSON` (whole service-account file as one script property) → RS256 JWT → OAuth access token
(cached 50 min in CacheService) → FCM HTTP v1 `projects/<project_id>/messages:send`. Project id is read from the
service account, never from the client. Unregistered tokens are pruned.

`scanHighSignalEvents` (time-driven, every 15 min via `installScannerTrigger`) pushes on three transitions only —
newly RED, Needs Ariel newly true, lifecycle newly in USER TEST REQUIRED — and seeds `MobilePushState` silently on
the first run.
