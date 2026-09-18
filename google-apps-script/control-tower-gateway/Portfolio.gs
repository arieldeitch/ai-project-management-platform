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

function cellIso_(value) {
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : value.toISOString();
  return str_(value, 64);
}

function isUserTestState_(lifecycle) {
  var s = String(lifecycle || '').toLowerCase();
  return USER_TEST_MARKERS.some(function (m) { return s.indexOf(m.toLowerCase()) >= 0; });
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
  var get = function (row, field, max) { return map[field] >= 0 ? str_(row[map[field]], max || 400) : ''; };
  var projects = [];
  rows.forEach(function (row, i) {
    var name = get(row, 'name', 160);
    if (!name) return; // blank/spacer rows
    var id = get(row, 'id', 80) || ('row-' + (i + 2));
    projects.push({
      id: id,
      key: name.toLowerCase().replace(/\s+/g, ' ').trim(),
      name: name,
      lifecycle: get(row, 'lifecycle', 80),
      rag: normalizeRag_(get(row, 'rag', 40)),
      confidence: get(row, 'confidence', 60),
      milestone: get(row, 'milestone'),
      next_action: get(row, 'next_action'),
      blocker: get(row, 'blocker'),
      needs_ariel: map.needs_ariel >= 0 ? truthy_(row[map.needs_ariel]) : false,
      ariel_input: get(row, 'ariel_input'),
      last_check: map.last_check >= 0 ? cellIso_(row[map.last_check]) : '',
      link: get(row, 'link', 500),
      objective: get(row, 'objective'),
      risk: get(row, 'risk'),
      user_test_required: isUserTestState_(get(row, 'lifecycle', 80))
    });
  });
  // Most recently checked first; rows without a date sink to the bottom.
  projects.sort(function (a, b) { return (b.last_check || '').localeCompare(a.last_check || ''); });
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
  var nameIdx = pick(['connection', 'name', 'system', 'source', 'שם']);
  var statusIdx = pick(['status', 'state', 'סטטוס']);
  var noteIdx = pick(['note', 'notes', 'detail', 'הערה']);
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
