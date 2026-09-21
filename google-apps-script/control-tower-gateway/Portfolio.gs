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
    user_test_required: isUserTestState_(lifecycle),
    // v5: optional one-line purpose for compact displays
    short_description: get('short_description', 160),
    display_name: get('display_name', 80),
    // v5: OS alignment record (curated by receipts, never by activity). Raw cells; evaluated in Os.gs.
    os_alignment: normalizeOsAlignment_(get('os_alignment', 40)),
    last_os_check: (map.last_os_check >= 0 ? parseCellDate_(row[map.last_os_check]) : { iso: '', raw: '' }).iso,
    os_version_seen: get('os_version_seen', 80),
    os_change_marker: get('os_change_marker', 120),
    os_evidence: get('os_evidence', 600),
    os_sync_action: get('os_sync_action', 300),
    board_row: rowNumber
  };
}

function normalizeOsAlignment_(value) {
  var v = String(value || '').trim().toUpperCase().replace(/[s-]+/g, '_');
  return OS_ALIGNMENT_STATES.indexOf(v) >= 0 ? v : (v ? 'UNKNOWN' : '');
}

/**
 * Deterministic status taxonomy (shared with the clients; tested on both sides). One bucket per project,
 * first rule wins: NEEDS_ARIEL › BLOCKED › AT_RISK › WATCH › OK. Freshness (stale) is a client-side modifier.
 * status_reason is the Hebrew "why" shown next to the status.
 */
function statusBucket_(p) {
  if (p.needs_ariel || p.user_test_required) {
    return { bucket: 'NEEDS_ARIEL', reason: p.user_test_required ? 'מחכה לבדיקה שלך בטלפון' : (p.ariel_input ? 'צריך אותך: ' + str_(p.ariel_input, 120) : 'צריך החלטה או פעולה שלך') };
  }
  var lc = String(p.lifecycle || '').toLowerCase();
  if (p.blocker || lc === 'blocked' || lc === 'חסום') {
    return { bucket: 'BLOCKED', reason: p.blocker ? 'חסום: ' + str_(p.blocker, 120) : 'מסומן כחסום בלוח' };
  }
  if (p.rag === 'RED') return { bucket: 'AT_RISK', reason: p.risk ? 'אדום בלוח: ' + str_(p.risk, 120) : 'אדום בלוח — דורש טיפול' };
  if (p.rag === 'YELLOW') return { bucket: 'WATCH', reason: p.risk ? 'צהוב בלוח: ' + str_(p.risk, 120) : 'צהוב בלוח — במעקב' };
  if (p.rag === 'GREEN') return { bucket: 'OK', reason: 'ירוק בלוח — אין חסם ואין החלטה פתוחה' };
  return { bucket: 'WATCH', reason: 'לא הוגדר רמזור בלוח' };
}

function applyStatusBucket_(p) {
  var s = statusBucket_(p);
  p.status_bucket = s.bucket;
  p.status_reason = s.reason;
  return p;
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
    if (p) projects.push(applyStatusBucket_(evaluateOsAlignment_(p)));
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
