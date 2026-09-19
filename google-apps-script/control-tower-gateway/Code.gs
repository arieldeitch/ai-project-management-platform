/**
 * Control Tower mobile gateway — Google Apps Script Web App.
 *
 * Architecture (approved 2026-09-18):
 *   PROJECT_CONTROL_BOARD Google Sheet  →  this gateway  →  Android client
 *   Firebase Cloud Messaging            =  push transport only
 *
 * Single JSON endpoint: POST { token, action, ...params }.
 * Every action is allow-listed below; every Drive resource is fixed in Config.gs.
 * The client never supplies spreadsheet IDs, sheet names, ranges, formulas or code.
 *
 * Script Properties (Project Settings → Script properties):
 *   GATEWAY_TOKEN              required  — high-entropy shared secret (≥ 32 chars). Same value goes into the Android build.
 *   FCM_SERVICE_ACCOUNT_JSON   optional  — Firebase service-account JSON (whole file). Enables push.
 *   PROJECTS_COLUMN_MAP        optional  — JSON {field: "Exact Header"} overriding header auto-detection.
 *   GITHUB_READ_TOKEN          optional  — raises GitHub API quota / enables intentionally configured private repos. Never required for public repos.
 */

var GATEWAY_VERSION = '0.9.0';

var ACTIONS = {
  health: function () { return healthReport_(); },
  portfolio: function (p) { return { projects: enrichPortfolioWithActivity_(readPortfolio_()), connections: p.include_connections ? readConnections_() : undefined, snapshot_at: nowIso_(), contract_version: GATEWAY_CONTRACT_VERSION }; },
  inbox: function (p) { return { items: listInbox_(clampInt_(p.limit, 1, 100, 30)) }; },
  submit_report: function (p) { return submitReport_(p); },
  register_device: function (p) { return registerDevice_(p); },
  unregister_device: function (p) { return unregisterDevice_(p); },
  test_push: function (p) { return testPush_(p); },
  activity: function (p) { return { items: listPushEvents_(clampInt_(p.limit, 1, 100, 30)) }; },
  project_activity: function (p) { return { items: listProjectActivity_(clampInt_(p.limit, 1, 200, 50), str_(p.project_id, 80)) }; },
  activity_heartbeat: function (p) { return recordActivityHeartbeat_(p); }
  ,ideas: function (p) { return { items: listIdeas_(clampInt_(p.limit, 1, 200, 100)) }; }
  ,create_idea: function (p) { return createIdea_(p); }
  ,update_idea: function (p) { return updateIdea_(p); }
};

function doPost(e) {
  var started = Date.now();
  var body;
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (raw.length > MAX_BODY_BYTES) return reply_(413, { ok: false, error: 'payload_too_large' });
    body = raw ? JSON.parse(raw) : {};
  } catch (err) {
    return reply_(400, { ok: false, error: 'invalid_json' });
  }
  if (!body || typeof body !== 'object') return reply_(400, { ok: false, error: 'invalid_json' });

  // Authenticate before touching Drive. Constant-time compare on the SHA-256 digests.
  if (!tokenMatches_(body.token)) {
    Utilities.sleep(250); // blunt brute-force throttle
    return reply_(401, { ok: false, error: 'unauthorized' });
  }
  delete body.token;

  var action = String(body.action || '');
  if (!Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
    return reply_(400, { ok: false, error: 'unknown_action' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var result = ACTIONS[action](body) || {};
    result.ok = true;
    result.action = action;
    result.gateway_version = GATEWAY_VERSION;
    result.contract_version = GATEWAY_CONTRACT_VERSION;
    result.elapsed_ms = Date.now() - started;
    return reply_(200, result);
  } catch (err) {
    console.error(action + ' failed: ' + (err && err.stack ? err.stack : err));
    return reply_(500, { ok: false, error: 'action_failed', action: action, message: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** GET is intentionally useless: no data, no hints. */
function doGet() {
  return reply_(405, { ok: false, error: 'post_only' });
}

// ---------- auth ----------

function tokenMatches_(candidate) {
  var expected = PropertiesService.getScriptProperties().getProperty('GATEWAY_TOKEN') || '';
  if (expected.length < 32 || typeof candidate !== 'string' || !candidate) return false;
  var a = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected, Utilities.Charset.UTF_8);
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, candidate, Utilities.Charset.UTF_8);
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= (a[i] ^ b[i]);
  return diff === 0;
}

// ---------- helpers ----------

/** Apps Script cannot set HTTP status codes on ContentService; the status travels in the JSON. */
function reply_(status, payload) {
  payload.status = status;
  // Version markers are not secrets; they let a deployment be verified without the token.
  if (payload.contract_version === undefined) payload.contract_version = GATEWAY_CONTRACT_VERSION;
  if (payload.gateway_version === undefined) payload.gateway_version = GATEWAY_VERSION;
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function clampInt_(value, min, max, fallback) {
  var n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function str_(value, maxLen) {
  if (value === null || value === undefined) return '';
  var s = String(value);
  return maxLen && s.length > maxLen ? s.slice(0, maxLen) : s;
}

function nowIso_() {
  return new Date().toISOString();
}

function healthReport_() {
  var ss = openBoard_();
  var tabs = ss.getSheets().map(function (s) { return s.getName(); });
  var mapping = resolveProjectColumns_();
  var resolved = {};
  var missing = [];
  Object.keys(mapping).forEach(function (field) {
    if (mapping[field] >= 0) resolved[field] = headerRow_()[mapping[field]]; else missing.push(field);
  });
  return {
    spreadsheet_title: ss.getName(),
    tabs: tabs,
    projects_rows: Math.max(0, ss.getSheetByName(PROJECTS_SHEET) ? ss.getSheetByName(PROJECTS_SHEET).getLastRow() - 1 : 0),
    mobile_tabs_ready: [INBOX_SHEET, DEVICES_SHEET, PUSH_STATE_SHEET, ACTIVITY_SOURCES_SHEET, ACTIVITY_LEDGER_SHEET, IDEAS_SHEET].every(function (n) { return tabs.indexOf(n) >= 0; }),
    resolved_columns: resolved,
    unresolved_columns: missing,
    active_devices: countActiveDevices_(),
    fcm_configured: isFcmConfigured_(),
    scanner_trigger_installed: isScannerTriggerInstalled_(),
    activity: activityHealth_(),
    contract_version: GATEWAY_CONTRACT_VERSION,
    server_time: nowIso_()
  };
}
