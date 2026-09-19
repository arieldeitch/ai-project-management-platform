/**
 * MANUAL DEPLOYMENT HELPER — generated from the canonical modular gateway files.
 * Paste this entire file into Apps Script Code.gs when deploying manually.
 * Canonical source remains the sibling modular files in this repository.
 * Regenerate with: node google-apps-script/control-tower-gateway/build-combined.mjs
 */


/* ===== Config.gs ===== */

/**
 * Fixed resources. Nothing in this file is ever taken from a request.
 */

// Canonical portfolio truth: PROJECT_CONTROL_BOARD.
var BOARD_SPREADSHEET_ID = '1EYeDgSd1yMUz7bPbreDlJX130yCay2BMtT_RyQoi2HA';
var PROJECTS_SHEET = 'Projects';
var CONNECTIONS_SHEET = 'Connections';

// Mobile-only operational tabs (transport state, never a second source of truth).
var INBOX_SHEET = 'MobileInbox';
var DEVICES_SHEET = 'MobileDevices';
var PUSH_STATE_SHEET = 'MobilePushState';
var ACTIVITY_SOURCES_SHEET = 'ActivitySources';
var ACTIVITY_LEDGER_SHEET = 'ActivityLedger';

var INBOX_HEADERS = ['received_at', 'source', 'status', 'evidence_level', 'report_text', 'project_hint', 'device_id', 'app_version', 'processed_at', 'notes'];
var DEVICES_HEADERS = ['token', 'device_id', 'device_label', 'platform', 'app_version', 'registered_at', 'last_seen_at', 'active'];
var PUSH_STATE_HEADERS = ['project_key', 'last_rag', 'last_needs_ariel', 'last_lifecycle', 'last_event', 'last_event_at', 'updated_at'];
var ACTIVITY_SOURCE_HEADERS = ['project_id', 'project_name', 'source_type', 'locator', 'branch', 'include_automation', 'enabled', 'last_poll_at', 'last_seen_at', 'notes'];
var ACTIVITY_LEDGER_HEADERS = ['event_id', 'occurred_at', 'observed_at', 'project_id', 'project_name', 'source_type', 'source_locator', 'activity_type', 'summary', 'evidence_url', 'evidence_level', 'metadata_json'];

var MAX_BODY_BYTES = 64 * 1024;
var MAX_REPORT_CHARS = 20000;

// Firebase project id is derived from the service-account JSON (project_id); never client-supplied.
var FCM_CHANNEL_ID = 'control_tower_alerts';

// Lifecycle values that mean "waiting for Ariel's physical test" (case-insensitive substring match).
var USER_TEST_MARKERS = ['user test required', 'user_test_required', 'מחכה לאריאל'];

/**
 * Header aliases for the Projects tab. Matching is case/whitespace/punctuation-insensitive,
 * exact alias first, then "header contains alias". Override any field with the
 * PROJECTS_COLUMN_MAP script property: {"name":"Project Name","rag":"Health", ...}.
 */
var PROJECT_FIELD_ALIASES = {
  id:           ['id', 'project id', 'key', 'project key', 'מזהה'],
  name:         ['project', 'project name', 'name', 'title', 'פרויקט', 'שם פרויקט', 'שם'],
  lifecycle:    ['lifecycle', 'stage', 'status', 'state', 'phase', 'שלב', 'סטטוס', 'מצב'],
  rag:          ['rag', 'health', 'traffic light', 'color', 'רמזור'],
  confidence:   ['confidence', 'evidence level', 'confidence level', 'ביטחון', 'רמת ביטחון'],
  milestone:    ['current milestone', 'milestone', 'אבן דרך נוכחית', 'אבן דרך'],
  next_action:  ['next action', 'next step', 'הפעולה הבאה', 'צעד הבא'],
  blocker:      ['blocker', 'blocker dependency', 'blocker / dependency', 'dependency', 'blockers', 'חסם', 'חסם תלות'],
  needs_ariel:  ['needs ariel', 'ariel needed', 'needs owner', 'צריך את אריאל', 'דורש אריאל'],
  ariel_input:  ['ariel input', 'ariel decision input', 'decision input', 'ariel decision', 'decision needed', 'קלט אריאל', 'החלטה נדרשת'],
  // Two distinct timestamps. Never present a Control Tower check as project activity.
  last_meaningful_progress: ['last meaningful progress', 'last meaningful action', 'last progress', 'last activity', 'last meaningful activity', 'פעילות אחרונה', 'התקדמות אחרונה'],
  last_control_check: ['last control check', 'last check', 'control check', 'last ct check', 'בדיקת שליטה אחרונה', 'בדיקה אחרונה'],
  expected_cadence: ['expected cadence', 'cadence', 'expected rhythm', 'rhythm', 'קצב צפוי', 'קצב'],
  progress_evidence: ['progress evidence', 'latest evidence', 'evidence summary', 'ראיות'],
  link:         ['primary link', 'link', 'url', 'drive link', 'קישור'],
  objective:    ['objective', 'goal', 'יעד', 'מטרה'],
  risk:         ['risk', 'risk drift', 'risk / drift', 'drift', 'סיכון']
};

function openBoard_() {
  return SpreadsheetApp.openById(BOARD_SPREADSHEET_ID);
}

/** Idempotently ensure a mobile tab exists with the expected header row. */
function ensureSheet_(name, headers) {
  var ss = openBoard_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim(); });
  headers.forEach(function (h, i) {
    if (existing[i] !== h) sheet.getRange(1, i + 1).setValue(h).setFontWeight('bold');
  });
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

function isFcmConfigured_() {
  var json = PropertiesService.getScriptProperties().getProperty('FCM_SERVICE_ACCOUNT_JSON');
  if (!json) return false;
  try {
    var sa = JSON.parse(json);
    return !!(sa.project_id && sa.client_email && sa.private_key);
  } catch (e) {
    return false;
  }
}

// Rows that are infrastructure/capabilities rather than child projects (e.g. Control Tower itself).
// They are still returned, flagged role = 'infrastructure', so clients can show them apart.
var INFRASTRUCTURE_NAME_PATTERNS = [/control\s*tower/i, /מגדל\s*הפיקוח/];

// Contract version reported by health/portfolio so clients can detect a stale deployment.
var GATEWAY_CONTRACT_VERSION = 3;


/* ===== Portfolio.gs ===== */

/**
 * Read-only view of the canonical Projects / Connections tabs.
 * Returns only what the Android UI renders; never the full backlog.
 */

var headerCache_ = null;

function normalizeHeader_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9֐-׿]+/g, ' ').trim();
}

function headerRow_() {
  if (headerCache_) return headerCache_;
  var sheet = openBoard_().getSheetByName(PROJECTS_SHEET);
  if (!sheet) throw new Error('Projects sheet not found');
  var lastCol = sheet.getLastColumn();
  headerCache_ = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim(); }) : [];
  return headerCache_;
}

/** field -> column index (0-based) or -1. Explicit PROJECTS_COLUMN_MAP wins over aliases. */
function resolveProjectColumns_() {
  var headers = headerRow_();
  var normalized = headers.map(normalizeHeader_);
  var override = {};
  try {
    override = JSON.parse(PropertiesService.getScriptProperties().getProperty('PROJECTS_COLUMN_MAP') || '{}') || {};
  } catch (e) {
    override = {};
  }
  var mapping = {};
  var taken = {};
  Object.keys(PROJECT_FIELD_ALIASES).forEach(function (field) {
    var idx = -1;
    if (override[field]) {
      idx = headers.indexOf(String(override[field]));
      if (idx < 0) idx = normalized.indexOf(normalizeHeader_(override[field]));
    }
    var aliases = PROJECT_FIELD_ALIASES[field].map(normalizeHeader_);
    if (idx < 0) {
      for (var a = 0; a < aliases.length && idx < 0; a++) {
        var exact = normalized.indexOf(aliases[a]);
        if (exact >= 0 && !taken[exact]) idx = exact;
      }
    }
    if (idx < 0) {
      for (var b = 0; b < aliases.length && idx < 0; b++) {
        for (var c = 0; c < normalized.length; c++) {
          if (!taken[c] && normalized[c] && normalized[c].indexOf(aliases[b]) >= 0) { idx = c; break; }
        }
      }
    }
    if (idx >= 0) taken[idx] = true;
    mapping[field] = idx;
  });
  return mapping;
}

function truthy_(value) {
  var s = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'כן' || s === 'x' || s === '✓' || s === 'v';
}

function normalizeRag_(value) {
  var s = String(value || '').trim().toUpperCase();
  if (s.indexOf('RED') === 0 || s === 'אדום' || s === '🔴') return 'RED';
  if (s.indexOf('GREEN') === 0 || s === 'ירוק' || s === '🟢') return 'GREEN';
  if (s.indexOf('YELLOW') === 0 || s.indexOf('AMBER') === 0 || s === 'צהוב' || s === '🟡') return 'YELLOW';
  return s ? 'YELLOW' : 'UNKNOWN';
}

function isDate_(value) {
  return Object.prototype.toString.call(value) === '[object Date]';
}

function cellIso_(value) {
  if (isDate_(value)) return isNaN(value.getTime()) ? '' : value.toISOString();
  return str_(value, 64);
}

function isUserTestState_(lifecycle) {
  var s = String(lifecycle || '').toLowerCase();
  return USER_TEST_MARKERS.some(function (m) { return s.indexOf(m.toLowerCase()) >= 0; });
}

/**
 * Timestamp cells: a real Date, or text. Accepted text shapes (deterministic, anchored at the start,
 * optionally preceded by ONE status word such as "VERIFIED"/"REPORTED"/"DONE"/"CHECKED"/"UPDATED"):
 *   2026-09-18T11:23:00Z / 2026-09-18T11:23:00.000+03:00   (ISO, any offset)
 *   2026-09-18 14:23  /  2026-09-18                        (Israel wall clock when no offset)
 *   18/09/2026 14:23  /  18.9.2026  /  18-09-2026           (DD/MM/YYYY)
 *   "VERIFIED 2026-09-17 08:07: sync ran"                  (status word + timestamp, then anything)
 * Anything else — prose, a date buried mid-sentence, "yesterday" — is NOT a timestamp.
 * Returns { iso: '' | ISO-8601, raw: original text }. Raw is preserved so the client can show the evidence
 * and say "no usable activity timestamp" instead of pretending.
 */
var TIMESTAMP_STATUS_PREFIX = /^(?:(?:VERIFIED|REPORTED|DONE|CHECKED|UPDATED|OK|מאומת|דווח)(?=[\s:\-–—])[\s:\-–—]*)?/i;
var ISRAEL_UTC_OFFSET_MINUTES_ = function (y, mo, d, h, mi) {
  // Israel: UTC+2, DST UTC+3 from the last Friday before the last Sunday of March (02:00) to the last Sunday of October (02:00).
  var lastSunday = function (year, month) { var t = new Date(Date.UTC(year, month + 1, 0)); return t.getUTCDate() - t.getUTCDay(); };
  var startDay = lastSunday(y, 2) - 2; // Friday before last Sunday of March
  var endDay = lastSunday(y, 9);
  var t = Date.UTC(y, mo, d, h, mi);
  var dstStart = Date.UTC(y, 2, startDay, 2, 0);
  var dstEnd = Date.UTC(y, 9, endDay, 2, 0);
  return (t >= dstStart && t < dstEnd) ? 180 : 120;
};
function israelToIso_(y, mo, d, h, mi) {
  var offset = ISRAEL_UTC_OFFSET_MINUTES_(y, mo, d, h, mi);
  var t = new Date(Date.UTC(y, mo, d, h, mi) - offset * 60000);
  return isNaN(t.getTime()) ? '' : t.toISOString();
}
function parseCellDate_(value) {
  if (isDate_(value)) return { iso: isNaN(value.getTime()) ? '' : value.toISOString(), raw: '' };
  var raw = str_(value, 400).trim();
  if (!raw) return { iso: '', raw: '' };
  var text = raw.replace(TIMESTAMP_STATUS_PREFIX, '');
  var m;
  // ISO with time and explicit zone/offset -> exact instant
  if ((m = text.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+\-]\d{2}:?\d{2}))/))) {
    var exact = new Date(m[1]);
    return { iso: isNaN(exact.getTime()) ? '' : exact.toISOString(), raw: raw };
  }
  // YYYY-MM-DD[ T]HH:mm[:ss] without zone -> Israel wall clock
  if ((m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?(?![\d])/))) {
    return { iso: israelToIso_(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0), raw: raw };
  }
  // DD/MM/YYYY[ HH:mm] (also . or - separators) -> Israel wall clock
  if ((m = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?(?![\d])/))) {
    return { iso: israelToIso_(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0), raw: raw };
  }
  return { iso: '', raw: raw };
}

function projectRole_(name) {
  for (var i = 0; i < INFRASTRUCTURE_NAME_PATTERNS.length; i++) {
    if (INFRASTRUCTURE_NAME_PATTERNS[i].test(name)) return 'infrastructure';
  }
  return 'project';
}

/**
 * Maps one Projects row (array of cell values) to the portfolio contract (v2).
 * Contract v1 fields are preserved; v2 adds explicit timestamps, cadence, evidence and role.
 */
function mapProjectRow_(row, map, rowNumber) {
  var get = function (field, max) { return map[field] >= 0 ? str_(row[map[field]], max || 400) : ''; };
  var name = get('name', 160);
  if (!name) return null; // blank/spacer rows
  var id = get('id', 80) || ('row-' + rowNumber);
  var lifecycle = get('lifecycle', 80);
  var progress = map.last_meaningful_progress >= 0 ? parseCellDate_(row[map.last_meaningful_progress]) : { iso: '', raw: '' };
  var check = map.last_control_check >= 0 ? parseCellDate_(row[map.last_control_check]) : { iso: '', raw: '' };
  return {
    id: id,
    key: name.toLowerCase().replace(/\s+/g, ' ').trim(),
    name: name,
    role: projectRole_(name),
    lifecycle: lifecycle,
    rag: normalizeRag_(get('rag', 40)),
    confidence: get('confidence', 60),
    milestone: get('milestone'),
    next_action: get('next_action'),
    blocker: get('blocker'),
    needs_ariel: map.needs_ariel >= 0 ? truthy_(row[map.needs_ariel]) : false,
    ariel_input: get('ariel_input'),
    // v1 compatibility: last_check keeps meaning "Last Control Check".
    last_check: check.iso,
    // v2 explicit semantics.
    last_meaningful_progress: progress.iso,
    last_meaningful_progress_raw: progress.raw,
    last_control_check: check.iso,
    last_control_check_raw: check.raw,
    expected_cadence: get('expected_cadence', 80),
    progress_evidence: get('progress_evidence', 600),
    link: get('link', 500),
    objective: get('objective'),
    risk: get('risk'),
    user_test_required: isUserTestState_(lifecycle)
  };
}

function readPortfolio_() {
  var sheet = openBoard_().getSheetByName(PROJECTS_SHEET);
  if (!sheet) throw new Error('Projects sheet not found');
  var map = resolveProjectColumns_();
  if (map.name < 0) throw new Error('Cannot find a project-name column in Projects; set PROJECTS_COLUMN_MAP');
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var projects = [];
  rows.forEach(function (row, i) {
    var p = mapProjectRow_(row, map, i + 2);
    if (p) projects.push(p);
  });
  // Most recent project activity first (falls back to control check); rows without a date sink to the bottom.
  projects.sort(function (a, b) {
    return ((b.last_meaningful_progress || b.last_check) || '').localeCompare((a.last_meaningful_progress || a.last_check) || '');
  });
  return projects;
}

/** Lightweight Connections view (name/status/note) — only when the client asks for it. */
function readConnections_() {
  var sheet = openBoard_().getSheetByName(CONNECTIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var lastCol = sheet.getLastColumn();
  var values = sheet.getRange(1, 1, sheet.getLastRow(), lastCol).getValues();
  var headers = values[0].map(normalizeHeader_);
  var pick = function (aliases) {
    for (var i = 0; i < aliases.length; i++) {
      var idx = headers.indexOf(normalizeHeader_(aliases[i]));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  var nameIdx = pick(['platform', 'connection', 'name', 'system', 'source', 'service', 'פלטפורמה', 'שם']);
  var statusIdx = pick(['verification status', 'status', 'state', 'connection status', 'סטטוס אימות', 'סטטוס']);
  var noteIdx = pick(['evidence connector', 'evidence', 'connector', 'note', 'notes', 'detail', 'ראיות', 'הערה']);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var name = nameIdx >= 0 ? str_(values[r][nameIdx], 120) : '';
    if (!name) continue;
    out.push({
      name: name,
      status: statusIdx >= 0 ? str_(values[r][statusIdx], 60) : '',
      note: noteIdx >= 0 ? str_(values[r][noteIdx], 200) : ''
    });
  }
  return out;
}


/* ===== Activity.gs ===== */

/**
 * Activity observability — append-only project activity evidence.
 *
 * PROJECT_CONTROL_BOARD remains the canonical status/milestone truth.
 * ActivitySources configures observable signals; ActivityLedger records what happened and when.
 * This layer must never overwrite curated project status merely because code changed.
 */

function readActivitySources_() {
  var sheet = ensureSheet_(ACTIVITY_SOURCES_SHEET, ACTIVITY_SOURCE_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, ACTIVITY_SOURCE_HEADERS.length).getValues();
  var out = [];
  values.forEach(function (row, i) {
    var projectId = str_(row[0], 80).trim();
    var locator = str_(row[3], 300).trim();
    if (!projectId || !locator) return;
    out.push({
      row: i + 2,
      project_id: projectId,
      project_name: str_(row[1], 160).trim(),
      source_type: str_(row[2], 40).trim(),
      locator: locator,
      branch: str_(row[4], 120).trim() || 'main',
      include_automation: truthy_(row[5]),
      enabled: row[6] === '' ? true : truthy_(row[6]),
      last_poll_at: cellIso_(row[7]),
      last_seen_at: cellIso_(row[8]),
      notes: str_(row[9], 400)
    });
  });
  return out;
}

function activityLedgerSheet_() {
  return ensureSheet_(ACTIVITY_LEDGER_SHEET, ACTIVITY_LEDGER_HEADERS);
}

var ACTIVITY_DEDUPE_WINDOW = 1200;
var ACTIVITY_LATEST_WINDOW = 2500;

function activityIdSet_() {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  var seen = {};
  if (lastRow < 2) return seen;
  var count = Math.min(ACTIVITY_DEDUPE_WINDOW, lastRow - 1);
  var start = lastRow - count + 1;
  var values = sheet.getRange(start, 1, count, 1).getValues();
  values.forEach(function (r) { if (r[0]) seen[String(r[0])] = true; });
  return seen;
}

function activityEventRow_(event) {
  return [
    str_(event.event_id, 240),
    str_(event.occurred_at, 64),
    str_(event.observed_at || nowIso_(), 64),
    str_(event.project_id, 80),
    str_(event.project_name, 160),
    str_(event.source_type, 60),
    str_(event.source_locator, 300),
    str_(event.activity_type, 40),
    str_(event.summary, 800),
    str_(event.evidence_url, 800),
    str_(event.evidence_level || 'OBSERVED', 40),
    str_(event.metadata_json, 1500)
  ];
}

function appendActivityEvents_(events, seen) {
  var rows = [];
  (events || []).forEach(function (event) {
    if (!event || !event.event_id || !event.project_id || !event.occurred_at) return;
    if (seen && seen[event.event_id]) return;
    rows.push(activityEventRow_(event));
    if (seen) seen[event.event_id] = true;
  });
  if (!rows.length) return 0;
  var sheet = activityLedgerSheet_();
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ACTIVITY_LEDGER_HEADERS.length).setValues(rows);
  return rows.length;
}

function appendActivityEvent_(event, seen) {
  return appendActivityEvents_([event], seen) === 1;
}

function normalizeHeartbeatTime_(value) {
  if (!value) return nowIso_();
  var parsed = parseCellDate_(value);
  return parsed.iso || '';
}

/** Direct structured heartbeat from a trusted gateway caller. */
function recordActivityHeartbeat_(p) {
  var projectId = str_(p.project_id, 80).trim();
  if (!projectId) throw new Error('project_id is required');
  var occurredAt = normalizeHeartbeatTime_(p.occurred_at);
  if (!occurredAt) throw new Error('occurred_at is not a supported timestamp');
  var sourceType = str_(p.source_type || p.source || 'agent_heartbeat', 60).trim();
  var activityType = str_(p.activity_type || 'report', 40).trim().toLowerCase();
  if (['progress', 'checkpoint', 'automation', 'report', 'control_check'].indexOf(activityType) < 0) activityType = 'report';
  var summary = str_(p.summary, 800).trim();
  if (!summary) throw new Error('summary is required');

  var eventId = str_(p.event_id, 240).trim();
  if (!eventId) {
    var material = projectId + '|' + occurredAt + '|' + sourceType + '|' + activityType + '|' + summary;
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, material, Utilities.Charset.UTF_8);
    eventId = 'heartbeat:' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '').slice(0, 32);
  }
  var seen = activityIdSet_();
  var inserted = appendActivityEvent_({
    event_id: eventId,
    occurred_at: occurredAt,
    observed_at: nowIso_(),
    project_id: projectId,
    project_name: str_(p.project_name, 160),
    source_type: sourceType,
    source_locator: str_(p.source_locator, 300),
    activity_type: activityType,
    summary: summary,
    evidence_url: str_(p.evidence_url || p.evidence_ref, 800),
    evidence_level: str_(p.evidence_level || 'REPORTED', 40),
    metadata_json: typeof p.metadata === 'object' && p.metadata ? JSON.stringify(p.metadata) : str_(p.metadata_json, 1500)
  }, seen);
  return { recorded: inserted, event_id: eventId, occurred_at: occurredAt };
}

function githubHeaders_() {
  var headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Ariel-Control-Tower/0.8'
  };
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_READ_TOKEN');
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

function githubJson_(url) {
  var res = UrlFetchApp.fetch(url, { method: 'get', headers: githubHeaders_(), muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, status: code, body: null, error: res.getContentText().slice(0, 200) };
  }
  try {
    return { ok: true, status: code, body: JSON.parse(res.getContentText()), error: '' };
  } catch (e) {
    return { ok: false, status: code, body: null, error: 'invalid_json' };
  }
}

function isAutomationCommit_(commit) {
  var author = commit && commit.author && commit.author.login ? String(commit.author.login).toLowerCase() : '';
  var committer = commit && commit.committer && commit.committer.login ? String(commit.committer.login).toLowerCase() : '';
  var message = commit && commit.commit && commit.commit.message ? String(commit.commit.message).toLowerCase() : '';
  if (author.indexOf('[bot]') >= 0 || committer.indexOf('[bot]') >= 0 || author.indexOf('github-actions') >= 0 || committer.indexOf('github-actions') >= 0) return true;
  return /^(chore\((?:data|feed|refresh|snapshot)\)|data|feed|refresh)(:|\s)/.test(message);
}

function githubCommitEvent_(source, commit) {
  if (!commit || !commit.sha || !commit.commit) return null;
  var when = commit.commit.committer && commit.commit.committer.date ? commit.commit.committer.date :
    commit.commit.author && commit.commit.author.date ? commit.commit.author.date : '';
  var parsed = parseCellDate_(when);
  if (!parsed.iso) return null;
  var automation = isAutomationCommit_(commit);
  var firstLine = str_(commit.commit.message || '', 500).split('\n')[0];
  return {
    event_id: 'github_commit:' + source.locator + ':' + commit.sha,
    occurred_at: parsed.iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'github_commit',
    source_locator: source.locator,
    activity_type: automation ? 'automation' : 'progress',
    summary: firstLine || ('Commit ' + String(commit.sha).slice(0, 7)),
    evidence_url: commit.html_url || ('https://github.com/' + source.locator + '/commit/' + commit.sha),
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify({ sha: commit.sha, branch: source.branch, automation: automation })
  };
}

function pollDriveFileSource_(source, seen) {
  var file = DriveApp.getFileById(source.locator);
  var updated = file.getLastUpdated();
  if (!updated || isNaN(updated.getTime())) return { inserted: 0, latest: '', errors: ['no_modified_time'] };
  var iso = updated.toISOString();
  var event = {
    event_id: 'drive_file:' + source.locator + ':' + iso,
    occurred_at: iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'drive_file',
    source_locator: source.locator,
    activity_type: 'report',
    summary: 'עודכן המקור הקנוני ב-Drive: ' + file.getName(),
    evidence_url: file.getUrl(),
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify({ name: file.getName() })
  };
  return { inserted: appendActivityEvent_(event, seen) ? 1 : 0, latest: iso, errors: [] };
}

function githubPrEvent_(source, pr) {
  if (!pr || !pr.number || !pr.updated_at) return null;
  var parsed = parseCellDate_(pr.updated_at);
  if (!parsed.iso) return null;
  var state = pr.merged_at ? 'merged' : (pr.state || 'updated');
  return {
    event_id: 'github_pr:' + source.locator + ':' + pr.number + ':' + parsed.iso,
    occurred_at: parsed.iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'github_pr',
    source_locator: source.locator,
    activity_type: 'progress',
    summary: 'PR #' + pr.number + ' · ' + state + ': ' + str_(pr.title, 500),
    evidence_url: pr.html_url || ('https://github.com/' + source.locator + '/pull/' + pr.number),
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify({ number: pr.number, state: pr.state || '', merged_at: pr.merged_at || '' })
  };
}

function githubRepoEvent_(source, event) {
  if (!event || !event.id || !event.created_at) return null;
  var parsed = parseCellDate_(event.created_at);
  if (!parsed.iso) return null;
  var payload = event.payload || {};
  var actor = event.actor && event.actor.login ? String(event.actor.login) : '';
  var type = String(event.type || '');
  var summary = '';
  var evidenceUrl = 'https://github.com/' + source.locator;
  var activityType = 'progress';
  var metadata = { event_id: event.id, github_type: type, actor: actor };

  if (type === 'PushEvent') {
    var commits = Array.isArray(payload.commits) ? payload.commits : [];
    var last = commits.length ? commits[commits.length - 1] : null;
    var message = last && last.message ? String(last.message).split('\n')[0] : '';
    var sha = last && last.sha ? last.sha : (payload.head || '');
    var synthetic = {
      author: { login: actor },
      committer: { login: actor },
      commit: { message: message }
    };
    activityType = isAutomationCommit_(synthetic) ? 'automation' : 'progress';
    summary = message || ('Git push · ' + String(payload.ref || '').replace('refs/heads/', ''));
    if (sha) evidenceUrl = 'https://github.com/' + source.locator + '/commit/' + sha;
    metadata.ref = payload.ref || '';
    metadata.sha = sha || '';
  } else if (type === 'PullRequestEvent') {
    var pr = payload.pull_request || {};
    var action = String(payload.action || 'updated');
    summary = 'PR #' + (pr.number || payload.number || '') + ' · ' + action + ': ' + str_(pr.title, 500);
    evidenceUrl = pr.html_url || ('https://github.com/' + source.locator + '/pull/' + (pr.number || payload.number || ''));
    metadata.number = pr.number || payload.number || '';
    metadata.action = action;
  } else if (type === 'PullRequestReviewEvent' || type === 'PullRequestReviewCommentEvent') {
    var reviewPr = payload.pull_request || {};
    summary = 'PR #' + (reviewPr.number || '') + ' · review: ' + str_(reviewPr.title, 500);
    evidenceUrl = reviewPr.html_url || evidenceUrl;
    activityType = 'checkpoint';
    metadata.number = reviewPr.number || '';
  } else {
    return null;
  }

  return {
    event_id: 'github_event:' + source.locator + ':' + event.id,
    occurred_at: parsed.iso,
    project_id: source.project_id,
    project_name: source.project_name,
    source_type: 'github_event',
    source_locator: source.locator,
    activity_type: activityType,
    summary: summary,
    evidence_url: evidenceUrl,
    evidence_level: 'OBSERVED',
    metadata_json: JSON.stringify(metadata)
  };
}

/**
 * Efficient repo observer: one Events API call per repository, every scanner run.
 * This catches pushes on PR branches as well as PR/review events, avoiding a main-branch-only blind spot.
 */
function pollGithubSource_(source, seen) {
  var res = githubJson_('https://api.github.com/repos/' + source.locator + '/events?per_page=15');
  if (!res.ok) return { inserted: 0, latest: '', errors: ['events:' + res.status] };
  if (!Array.isArray(res.body)) return { inserted: 0, latest: '', errors: ['events:invalid_body'] };
  var latest = '';
  var pending = [];
  for (var i = res.body.length - 1; i >= 0; i--) {
    var e = githubRepoEvent_(source, res.body[i]);
    if (!e) continue;
    if (!latest || e.occurred_at > latest) latest = e.occurred_at;
    if (!source.include_automation && e.activity_type === 'automation') continue;
    pending.push(e);
  }
  var inserted = appendActivityEvents_(pending, seen);
  return { inserted: inserted, latest: latest, errors: [] };
}

/**
 * Poll all configured sources. Public GitHub repos require no token.
 * Optional GITHUB_READ_TOKEN only increases rate limit / enables intentionally configured private repos.
 */
function pollActivitySources_() {
  var sources = readActivitySources_();
  var seen = activityIdSet_();
  var sourceSheet = ensureSheet_(ACTIVITY_SOURCES_SHEET, ACTIVITY_SOURCE_HEADERS);
  var now = nowIso_();
  var inserted = 0, checked = 0, errors = [];

  sources.forEach(function (source) {
    if (!source.enabled) return;
    checked++;
    var result = { inserted: 0, latest: '', errors: [] };
    try {
      if (source.source_type === 'github_repo') result = pollGithubSource_(source, seen);
      else if (source.source_type === 'drive_file') result = pollDriveFileSource_(source, seen);
      else result.errors.push('unsupported:' + source.source_type);
    } catch (err) {
      result.errors.push(String(err && err.message ? err.message : err));
    }
    inserted += result.inserted;
    if (result.errors.length) errors.push(source.project_id + ':' + result.errors.join(','));
    sourceSheet.getRange(source.row, 8).setValue(now);
    if (result.latest) sourceSheet.getRange(source.row, 9).setValue(result.latest);
  });
  return { checked: checked, inserted: inserted, errors: errors };
}

function latestActivityByProject_() {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  var out = {};
  if (lastRow < 2) return out;
  var count = Math.min(ACTIVITY_LATEST_WINDOW, lastRow - 1);
  var start = lastRow - count + 1;
  var values = sheet.getRange(start, 1, count, ACTIVITY_LEDGER_HEADERS.length).getValues();
  values.forEach(function (row) {
    var projectId = str_(row[3], 80);
    if (!projectId) return;
    var parsed = parseCellDate_(row[1]);
    if (!parsed.iso) return;
    var e = {
      event_id: str_(row[0], 240),
      occurred_at: parsed.iso,
      observed_at: cellIso_(row[2]),
      project_id: projectId,
      project_name: str_(row[4], 160),
      source_type: str_(row[5], 60),
      source_locator: str_(row[6], 300),
      activity_type: str_(row[7], 40),
      summary: str_(row[8], 800),
      evidence_url: str_(row[9], 800),
      evidence_level: str_(row[10], 40)
    };
    var slot = out[projectId] || { any: null, meaningful: null };
    if (!slot.any || e.occurred_at > slot.any.occurred_at) slot.any = e;
    if (e.activity_type !== 'automation' && e.activity_type !== 'control_check') {
      if (!slot.meaningful || e.occurred_at > slot.meaningful.occurred_at) slot.meaningful = e;
    }
    out[projectId] = slot;
  });
  return out;
}

function copyActivityFields_(p, prefix, e) {
  p[prefix + '_at'] = e ? e.occurred_at : '';
  p[prefix + '_type'] = e ? e.activity_type : '';
  p[prefix + '_source'] = e ? e.source_type : '';
  p[prefix + '_summary'] = e ? e.summary : '';
  p[prefix + '_evidence_url'] = e ? e.evidence_url : '';
  p[prefix + '_evidence_level'] = e ? e.evidence_level : '';
}

function boardProgressEvent_(p) {
  if (!p.last_meaningful_progress) return null;
  return {
    occurred_at: p.last_meaningful_progress,
    activity_type: 'progress',
    source_type: 'project_board',
    summary: p.progress_evidence || 'עדכון התקדמות בלוח',
    evidence_url: p.link || '',
    evidence_level: 'CURATED'
  };
}

/** Enrich portfolio rows without mutating canonical status fields. */
function enrichPortfolioWithActivity_(projects) {
  var byProject = latestActivityByProject_();
  projects.forEach(function (p) {
    var slot = byProject[p.id] || { any: null, meaningful: null };
    var board = boardProgressEvent_(p);
    var latestAny = slot.any;
    var latestMeaningful = slot.meaningful;
    if (board && (!latestAny || board.occurred_at > latestAny.occurred_at)) latestAny = board;
    if (board && (!latestMeaningful || board.occurred_at > latestMeaningful.occurred_at)) latestMeaningful = board;
    copyActivityFields_(p, 'latest_activity', latestAny);
    copyActivityFields_(p, 'latest_meaningful_activity', latestMeaningful);
  });
  return projects;
}

function listProjectActivity_(limit, projectId) {
  var sheet = activityLedgerSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, ACTIVITY_LEDGER_HEADERS.length).getValues();
  var items = [];
  for (var i = values.length - 1; i >= 0 && items.length < limit; i--) {
    var row = values[i];
    if (projectId && String(row[3]) !== projectId) continue;
    items.push({
      event_id: str_(row[0], 240),
      occurred_at: cellIso_(row[1]),
      observed_at: cellIso_(row[2]),
      project_id: str_(row[3], 80),
      project_name: str_(row[4], 160),
      source_type: str_(row[5], 60),
      activity_type: str_(row[7], 40),
      summary: str_(row[8], 800),
      evidence_url: str_(row[9], 800),
      evidence_level: str_(row[10], 40)
    });
  }
  items.sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
  return items.slice(0, limit);
}

function activityHealth_() {
  var sources = readActivitySources_();
  var ledger = activityLedgerSheet_();
  var lastObserved = '';
  if (ledger.getLastRow() >= 2) {
    var values = ledger.getRange(2, 2, ledger.getLastRow() - 1, 1).getValues();
    values.forEach(function (r) {
      var p = parseCellDate_(r[0]);
      if (p.iso && p.iso > lastObserved) lastObserved = p.iso;
    });
  }
  return {
    sources_enabled: sources.filter(function (s) { return s.enabled; }).length,
    ledger_events: Math.max(0, ledger.getLastRow() - 1),
    latest_observed_activity: lastObserved
  };
}


/* ===== Inbox.gs ===== */

/**
 * MobileInbox — external reports and deputy commands entering from the phone.
 *
 * Evidence boundary: everything lands as status REPORTED / evidence_level REPORTED.
 * Acceptance by this gateway never makes a report VERIFIED; the Control Tower
 * process promotes it after checking evidence.
 */

var INBOX_SOURCES = ['share', 'deputy_command', 'manual'];

function submitReport_(p) {
  var text = str_(p.report_text, MAX_REPORT_CHARS).trim();
  if (!text) throw new Error('report_text is required');
  var source = INBOX_SOURCES.indexOf(String(p.source || '')) >= 0 ? String(p.source) : 'manual';
  var sheet = ensureSheet_(INBOX_SHEET, INBOX_HEADERS);
  var receivedAt = nowIso_();
  sheet.appendRow([
    receivedAt,
    source,
    'REPORTED',
    'REPORTED',
    text,
    str_(p.project_hint, 160),
    str_(p.device_id, 80),
    str_(p.app_version, 40),
    '',
    ''
  ]);
  return { received_at: receivedAt, status: 'REPORTED', row: sheet.getLastRow() };
}

function listInbox_(limit) {
  var sheet = ensureSheet_(INBOX_SHEET, INBOX_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var count = Math.min(limit, lastRow - 1);
  var values = sheet.getRange(lastRow - count + 1, 1, count, INBOX_HEADERS.length).getValues();
  var items = values.map(function (row) {
    return {
      received_at: cellIso_(row[0]),
      source: str_(row[1], 40),
      status: str_(row[2], 40) || 'REPORTED',
      evidence_level: str_(row[3], 40) || 'REPORTED',
      report_text: str_(row[4], 600),
      project_hint: str_(row[5], 160),
      processed_at: cellIso_(row[8]),
      notes: str_(row[9], 300)
    };
  });
  items.reverse(); // newest first
  return items;
}


/* ===== Devices.gs ===== */

/**
 * MobileDevices — FCM tokens of the owner's Control Tower installs. Upsert keyed on token.
 */

function findDeviceRow_(sheet, token) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var tokens = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]) === token) return i + 2;
  }
  return -1;
}

function registerDevice_(p) {
  var token = str_(p.token, 4096).trim();
  if (token.length < 20) throw new Error('token is required');
  var sheet = ensureSheet_(DEVICES_SHEET, DEVICES_HEADERS);
  var now = nowIso_();
  var row = findDeviceRow_(sheet, token);
  var values = [
    token,
    str_(p.device_id, 80),
    str_(p.device_label, 120),
    'android',
    str_(p.app_version, 40),
    row > 0 ? sheet.getRange(row, 6).getValue() || now : now,
    now,
    true
  ];
  if (row > 0) {
    sheet.getRange(row, 1, 1, DEVICES_HEADERS.length).setValues([values]);
  } else {
    sheet.appendRow(values);
    row = sheet.getLastRow();
  }
  // A re-installed app gets a new token; retire older rows from the same device_id.
  var deviceId = str_(p.device_id, 80);
  if (deviceId) {
    var lastRow = sheet.getLastRow();
    var all = sheet.getRange(2, 1, lastRow - 1, DEVICES_HEADERS.length).getValues();
    for (var i = 0; i < all.length; i++) {
      var r = i + 2;
      if (r !== row && String(all[i][1]) === deviceId && all[i][7] === true) sheet.getRange(r, 8).setValue(false);
    }
  }
  return { registered: true, row: row, active_devices: countActiveDevices_() };
}

function unregisterDevice_(p) {
  var token = str_(p.token, 4096).trim();
  if (!token) throw new Error('token is required');
  var sheet = ensureSheet_(DEVICES_SHEET, DEVICES_HEADERS);
  var row = findDeviceRow_(sheet, token);
  if (row > 0) sheet.deleteRow(row);
  return { unregistered: row > 0, active_devices: countActiveDevices_() };
}

function activeDeviceTokens_() {
  var sheet = ensureSheet_(DEVICES_SHEET, DEVICES_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, DEVICES_HEADERS.length).getValues();
  var out = [];
  values.forEach(function (row, i) {
    if (row[7] === true && String(row[0])) out.push({ row: i + 2, token: String(row[0]) });
  });
  return out;
}

function countActiveDevices_() {
  return activeDeviceTokens_().length;
}

function removeDeviceRows_(rows) {
  // Delete bottom-up so indices stay valid.
  var sheet = ensureSheet_(DEVICES_SHEET, DEVICES_HEADERS);
  rows.sort(function (a, b) { return b - a; }).forEach(function (r) { sheet.deleteRow(r); });
}


/* ===== Push.gs ===== */

/**
 * FCM HTTP v1 sender. The Firebase service account lives only in the
 * FCM_SERVICE_ACCOUNT_JSON script property; a short-lived OAuth access token is minted here
 * and cached for ~50 minutes. Firebase project id comes from that JSON, never from the client.
 */

function serviceAccount_() {
  var json = PropertiesService.getScriptProperties().getProperty('FCM_SERVICE_ACCOUNT_JSON');
  if (!json) throw new Error('FCM_SERVICE_ACCOUNT_JSON script property is not set');
  var sa = JSON.parse(json);
  if (!sa.project_id || !sa.client_email || !sa.private_key) throw new Error('FCM_SERVICE_ACCOUNT_JSON is incomplete');
  return sa;
}

function base64Url_(bytesOrString) {
  var b64 = typeof bytesOrString === 'string'
    ? Utilities.base64EncodeWebSafe(bytesOrString, Utilities.Charset.UTF_8)
    : Utilities.base64EncodeWebSafe(bytesOrString);
  return b64.replace(/=+$/, '');
}

function fcmAccessToken_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('fcm_access_token');
  if (cached) return cached;

  var sa = serviceAccount_();
  var now = Math.floor(Date.now() / 1000);
  var header = base64Url_(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var claims = base64Url_(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  var unsigned = header + '.' + claims;
  var signature = Utilities.computeRsaSha256Signature(unsigned, sa.private_key);
  var assertion = unsigned + '.' + base64Url_(signature);

  var res = UrlFetchApp.fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('OAuth exchange failed: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  var token = JSON.parse(res.getContentText()).access_token;
  cache.put('fcm_access_token', token, 3000);
  return token;
}

/**
 * Send one message to every active device. data keys: event, target, project_id (all strings).
 * Returns {sent, failed, errors}. Unregistered tokens are removed from MobileDevices.
 */
function sendPush_(title, body, data) {
  var sa = serviceAccount_();
  var accessToken = fcmAccessToken_();
  var devices = activeDeviceTokens_();
  if (devices.length === 0) return { sent: 0, failed: 0, note: 'no registered devices' };

  var safeTitle = str_(title, 80) || 'מגדל הפיקוח';
  var safeBody = str_(body, 200) || 'יש עדכון שדורש את תשומת לבך.';
  var payloadData = {};
  Object.keys(data || {}).forEach(function (k) { payloadData[k] = str_(data[k], 200); });
  payloadData.title = safeTitle;
  payloadData.body = safeBody;

  var requests = devices.map(function (d) {
    return {
      url: 'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send',
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken },
      payload: JSON.stringify({
        message: {
          token: d.token,
          notification: { title: safeTitle, body: safeBody },
          data: payloadData,
          android: { priority: 'high', notification: { channel_id: FCM_CHANNEL_ID, default_sound: true } }
        }
      }),
      muteHttpExceptions: true
    };
  });

  var responses = UrlFetchApp.fetchAll(requests);
  var sent = 0, failed = 0, errors = [], dead = [];
  responses.forEach(function (res, i) {
    var code = res.getResponseCode();
    if (code === 200) { sent++; return; }
    failed++;
    var text = res.getContentText();
    if (errors.length < 3) errors.push(code + ' ' + text.slice(0, 160));
    if (code === 404 || text.indexOf('UNREGISTERED') >= 0 || text.indexOf('NOT_FOUND') >= 0) dead.push(devices[i].row);
  });
  if (dead.length) removeDeviceRows_(dead);
  return { sent: sent, failed: failed, errors: errors };
}

/** Bounded test push: only to registered Control Tower device rows. */
function testPush_(p) {
  if (!isFcmConfigured_()) return { sent: 0, failed: 0, fcm_configured: false, note: 'FCM_SERVICE_ACCOUNT_JSON not set' };
  var result = sendPush_('בדיקת מגדל הפיקוח', 'ההתראות פועלות. אפשר להמשיך.', { event: 'test', target: 'activity' });
  result.fcm_configured = true;
  return result;
}


/* ===== Scanner.gs ===== */

/**
 * High-signal scanner. Run by a time-driven trigger (see installScannerTrigger).
 *
 * Sends a push only on a transition, deduplicated via MobilePushState:
 *   * project newly RED
 *   * Needs Ariel newly true
 *   * lifecycle newly in a USER TEST REQUIRED state
 * The first run seeds the state without sending anything, so installing the trigger
 * never floods the phone with the current backlog.
 */

var SCANNER_FUNCTION = 'scanHighSignalEvents';

function readPushState_() {
  var sheet = ensureSheet_(PUSH_STATE_SHEET, PUSH_STATE_HEADERS);
  var lastRow = sheet.getLastRow();
  var byKey = {};
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, PUSH_STATE_HEADERS.length).getValues();
    values.forEach(function (row, i) {
      byKey[String(row[0])] = { row: i + 2, rag: String(row[1]), needs_ariel: truthy_(row[2]), lifecycle: String(row[3]), last_event: String(row[4] || ''), last_event_at: cellIso_(row[5]) };
    });
  }
  return { sheet: sheet, byKey: byKey, seeded: lastRow >= 2 };
}

function scanHighSignalEvents() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { skipped: 'locked' };
  try {
    // Refresh observable project activity first. Failure here must not disable high-signal supervision.
    var activityPoll = { checked: 0, inserted: 0, errors: [] };
    try {
      activityPoll = pollActivitySources_();
    } catch (activityErr) {
      activityPoll.errors = [String(activityErr && activityErr.message ? activityErr.message : activityErr)];
      console.error('activity poll failed: ' + activityPoll.errors[0]);
    }
    var projects = readPortfolio_();
    var state = readPushState_();
    var now = nowIso_();
    var sent = [];
    var writes = [];

    projects.forEach(function (p) {
      var prev = state.byKey[p.key];
      var events = [];
      if (state.seeded) {
        if (p.rag === 'RED' && (!prev || prev.rag !== 'RED')) events.push('project_red');
        if (p.needs_ariel && (!prev || !prev.needs_ariel)) events.push('needs_ariel');
        if (p.user_test_required && (!prev || !isUserTestState_(prev.lifecycle))) events.push('user_test_required');
      }
      var lastEvent = events.length ? events.join('+') : (prev ? prev.last_event : 'seeded');
      var lastEventAt = events.length ? now : (prev ? prev.last_event_at : '');
      events.forEach(function (ev) {
        if (!isFcmConfigured_()) return;
        var msg = eventMessage_(ev, p);
        try {
          var r = sendPush_(msg.title, msg.body, { event: ev, target: msg.target, project_id: p.id });
          sent.push({ project: p.name, event: ev, sent: r.sent, failed: r.failed });
        } catch (err) {
          console.error('push failed for ' + p.name + ': ' + err);
        }
      });
      writes.push({
        key: p.key,
        row: prev ? prev.row : 0,
        values: [p.key, p.rag, p.needs_ariel, p.lifecycle, lastEvent, lastEventAt, now]
      });
    });

    // Persist state: update known rows in place, append new ones.
    var appendRows = [];
    writes.forEach(function (w) {
      if (w.row > 0) state.sheet.getRange(w.row, 1, 1, PUSH_STATE_HEADERS.length).setValues([w.values]);
      else appendRows.push(w.values);
    });
    if (appendRows.length) {
      state.sheet.getRange(state.sheet.getLastRow() + 1, 1, appendRows.length, PUSH_STATE_HEADERS.length).setValues(appendRows);
    }
    return { scanned: projects.length, seeded_now: !state.seeded, pushes: sent, activity_poll: activityPoll };
  } finally {
    lock.releaseLock();
  }
}


function eventMessage_(event, p) {
  switch (event) {
    case 'project_red':
      return { title: 'פרויקט הפך לאדום: ' + p.name, body: p.blocker || p.next_action || 'נדרשת בדיקת שליטה עכשיו.', target: 'projects' };
    case 'needs_ariel':
      return { title: 'החלטה ממתינה לך: ' + p.name, body: p.ariel_input || 'פרויקט ממתין להחלטה שלך.', target: 'now' };
    case 'user_test_required':
      return { title: 'מחכה לאריאל — בדיקת משתמש: ' + p.name, body: p.next_action || 'הגרסה מוכנה לבדיקה שלך.', target: 'projects' };
    default:
      return { title: 'מגדל הפיקוח', body: p.name, target: 'now' };
  }
}

/** Recent push events for the Activity tab (newest first), derived from MobilePushState. */
function listPushEvents_(limit) {
  var sheet = ensureSheet_(PUSH_STATE_SHEET, PUSH_STATE_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, PUSH_STATE_HEADERS.length).getValues();
  var items = [];
  values.forEach(function (row) {
    var ev = String(row[4] || '');
    var at = cellIso_(row[5]);
    if (!ev || ev === 'seeded' || !at) return;
    items.push({ project_key: String(row[0]), event: ev, rag: String(row[1]), lifecycle: String(row[3]), occurred_at: at });
  });
  items.sort(function (a, b) { return b.occurred_at.localeCompare(a.occurred_at); });
  return items.slice(0, limit);
}

// ---------- trigger management (run once from the editor) ----------

function isScannerTriggerInstalled_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === SCANNER_FUNCTION; });
}

/** Run once from the Apps Script editor: creates a 15-minute time-driven trigger (idempotent). */
function installScannerTrigger() {
  if (isScannerTriggerInstalled_()) return 'already installed';
  ScriptApp.newTrigger(SCANNER_FUNCTION).timeBased().everyMinutes(15).create();
  return 'installed';
}

function removeScannerTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === SCANNER_FUNCTION) ScriptApp.deleteTrigger(t);
  });
  return 'removed';
}

// ---------- editor smoke tests (no HTTP needed) ----------

/** Run from the editor after setting script properties: logs the health report. */
function debugHealth() {
  console.log(JSON.stringify(healthReport_(), null, 2));
}

/** Run from the editor: sends a test push to registered devices. */
function debugTestPush() {
  console.log(JSON.stringify(testPush_({}), null, 2));
}


/* ===== Code.gs ===== */

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

var GATEWAY_VERSION = '0.8.0';

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
    mobile_tabs_ready: [INBOX_SHEET, DEVICES_SHEET, PUSH_STATE_SHEET, ACTIVITY_SOURCES_SHEET, ACTIVITY_LEDGER_SHEET].every(function (n) { return tabs.indexOf(n) >= 0; }),
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
