/**
 * Ideas is the canonical idea incubator for Control Tower.
 * An idea stays here until it is promoted deliberately; it never becomes a project by accident.
 *
 * Columns are resolved BY HEADER NAME (Ariel adds columns to the sheet; positions are not assumed).
 * Missing headers from IDEA_HEADERS are appended to the header row once.
 * Manual planning: planning_bucket ∈ NOW | NEXT | LATER and manual_order (integer, ascending) are the
 * only ordering truth; listIdeas_ returns items sorted by bucket, then manual_order, then updated_at.
 */
var IDEA_STAGES = ['INBOX', 'CLARIFY', 'SHAPE', 'VALIDATE', 'READY', 'PARKED', 'PROMOTED', 'ARCHIVED'];
var IDEA_ENUMS = {
  usage_frequency: ['ONE_OFF', 'OCCASIONAL', 'WEEKLY', 'DAILY'],
  urgency: ['LOW', 'MEDIUM', 'HIGH'],
  surface: ['MOBILE', 'WEB', 'AUTOMATION', 'AGENT', 'PROCESS', 'UNDECIDED'],
  automation_level: ['MANUAL', 'ASSISTED', 'AUTOMATIC', 'UNDECIDED']
};
var IDEA_BUCKET_RANK = { NOW: 0, NEXT: 1, LATER: 2 };

function ideaValue_(p, key, max) { return str_(p[key], max || MAX_IDEA_TEXT).trim(); }
function ideaEnum_(p, key, allowed, fallback) {
  var value = ideaValue_(p, key, 40).toUpperCase();
  return allowed.indexOf(value) >= 0 ? value : fallback;
}
function ideaId_() { return 'IDEA-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }

/** Sheet + header→column map (1-based). Appends any missing canonical headers at the end of the header row. */
function ideasSheet_() {
  var ss = openBoard_();
  var sheet = ss.getSheetByName(IDEAS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(IDEAS_SHEET);
    sheet.getRange(1, 1, 1, IDEA_HEADERS.length).setValues([IDEA_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  var lastCol = Math.max(1, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var cols = {};
  headers.forEach(function (h, i) { if (h && cols[h] === undefined) cols[h] = i + 1; });
  var missing = IDEA_HEADERS.filter(function (h) { return cols[h] === undefined; });
  if (missing.length) {
    var start = headers.length + 1;
    sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
    missing.forEach(function (h, i) { cols[h] = start + i; });
  }
  return { sheet: sheet, cols: cols, width: Math.max(headers.length, sheet.getLastColumn()) };
}

function ideaFromRow_(row, cols) {
  var out = {};
  IDEA_HEADERS.forEach(function (h) {
    var c = cols[h];
    var v = c ? row[c - 1] : '';
    if (h.indexOf('_at') > 0) out[h] = cellIso_(v);
    else if (h === 'manual_order') out[h] = v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
    else out[h] = str_(v, MAX_IDEA_TEXT);
  });
  out.planning_bucket = IDEA_BUCKETS.indexOf(String(out.planning_bucket).toUpperCase()) >= 0 ? String(out.planning_bucket).toUpperCase() : 'LATER';
  out.maturity_score = ideaMaturity_(out);
  return out;
}

function createIdea_(p) {
  var title = ideaValue_(p, 'title', 180);
  if (!title) throw new Error('title is required');
  var now = nowIso_();
  var s = ideasSheet_();
  var existing = listIdeas_(500);
  var bucket = ideaEnum_(p, 'planning_bucket', IDEA_BUCKETS, 'LATER');
  var maxOrder = 0;
  existing.forEach(function (x) { if (x.planning_bucket === bucket && x.manual_order !== null && x.manual_order > maxOrder) maxOrder = x.manual_order; });
  var row = {
    idea_id: ideaId_(), created_at: now, updated_at: now, title: title,
    stage: ideaEnum_(p, 'stage', IDEA_STAGES, 'INBOX'),
    need: ideaValue_(p, 'need'), target_user: ideaValue_(p, 'target_user', 200),
    desired_outcome: ideaValue_(p, 'desired_outcome'), core_functionality: ideaValue_(p, 'core_functionality'),
    usage_frequency: ideaEnum_(p, 'usage_frequency', IDEA_ENUMS.usage_frequency, 'OCCASIONAL'),
    urgency: ideaEnum_(p, 'urgency', IDEA_ENUMS.urgency, 'MEDIUM'),
    surface: ideaEnum_(p, 'surface', IDEA_ENUMS.surface, 'UNDECIDED'),
    automation_level: ideaEnum_(p, 'automation_level', IDEA_ENUMS.automation_level, 'UNDECIDED'),
    data_needed: ideaValue_(p, 'data_needed'), success_metric: ideaValue_(p, 'success_metric'),
    constraints: ideaValue_(p, 'constraints'), next_step: ideaValue_(p, 'next_step'), notes: ideaValue_(p, 'notes'),
    planning_bucket: bucket,
    manual_order: p.manual_order !== undefined && !isNaN(Number(p.manual_order)) ? Number(p.manual_order) : maxOrder + 10
  };
  var line = [];
  for (var i = 0; i < s.width; i++) line.push('');
  IDEA_HEADERS.forEach(function (h) { line[s.cols[h] - 1] = row[h] === null || row[h] === undefined ? '' : row[h]; });
  s.sheet.appendRow(line);
  return { item: row, row: s.sheet.getLastRow() };
}

function sortIdeas_(items) {
  items.sort(function (a, b) {
    var ba = IDEA_BUCKET_RANK[a.planning_bucket], bb = IDEA_BUCKET_RANK[b.planning_bucket];
    if (ba !== bb) return ba - bb;
    var oa = a.manual_order === null ? Number.MAX_SAFE_INTEGER : a.manual_order;
    var ob = b.manual_order === null ? Number.MAX_SAFE_INTEGER : b.manual_order;
    if (oa !== ob) return oa - ob;
    return String(b.updated_at).localeCompare(String(a.updated_at));
  });
  return items;
}

function listIdeas_(limit) {
  var s = ideasSheet_();
  if (s.sheet.getLastRow() < 2) return [];
  var values = s.sheet.getRange(2, 1, s.sheet.getLastRow() - 1, s.width).getValues();
  var items = values.map(function (row) { return ideaFromRow_(row, s.cols); })
    .filter(function (x) { return x.idea_id && x.title && x.stage !== 'ARCHIVED'; });
  return sortIdeas_(items).slice(0, limit);
}

function ideaMaturity_(x) {
  var keys = ['need', 'target_user', 'desired_outcome', 'core_functionality', 'usage_frequency', 'urgency', 'surface', 'automation_level', 'success_metric', 'next_step'];
  var filled = keys.filter(function (k) { return x[k] && x[k] !== 'UNDECIDED'; }).length;
  return Math.round(filled * 100 / keys.length);
}

function findIdeaRow_(s, id) {
  if (s.sheet.getLastRow() < 2) return -1;
  var ids = s.sheet.getRange(2, s.cols.idea_id, s.sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function updateIdea_(p) {
  var id = ideaValue_(p, 'idea_id', 40);
  if (!id) throw new Error('idea_id is required');
  var s = ideasSheet_();
  var rowIndex = findIdeaRow_(s, id);
  if (rowIndex < 0) throw new Error('idea not found');
  var editable = ['title', 'need', 'target_user', 'desired_outcome', 'core_functionality', 'data_needed', 'success_metric', 'constraints', 'next_step', 'notes'];
  editable.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(p, key)) s.sheet.getRange(rowIndex, s.cols[key]).setValue(ideaValue_(p, key, key === 'title' ? 180 : MAX_IDEA_TEXT));
  });
  Object.keys(IDEA_ENUMS).forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(p, key)) s.sheet.getRange(rowIndex, s.cols[key]).setValue(ideaEnum_(p, key, IDEA_ENUMS[key], 'UNDECIDED'));
  });
  if (Object.prototype.hasOwnProperty.call(p, 'stage')) s.sheet.getRange(rowIndex, s.cols.stage).setValue(ideaEnum_(p, 'stage', IDEA_STAGES, 'INBOX'));
  if (Object.prototype.hasOwnProperty.call(p, 'planning_bucket')) s.sheet.getRange(rowIndex, s.cols.planning_bucket).setValue(ideaEnum_(p, 'planning_bucket', IDEA_BUCKETS, 'LATER'));
  if (Object.prototype.hasOwnProperty.call(p, 'manual_order') && !isNaN(Number(p.manual_order))) s.sheet.getRange(rowIndex, s.cols.manual_order).setValue(Number(p.manual_order));
  var now = nowIso_();
  s.sheet.getRange(rowIndex, s.cols.updated_at).setValue(now);
  return { idea_id: id, updated_at: now };
}

/**
 * Batch reorder from a drag & drop: items = [{idea_id, planning_bucket, manual_order}], applied atomically
 * per row (bucket + order only). Unknown ids are reported, not fatal. Order values are normalised to 10,20,…
 */
function reorderIdeas_(p) {
  var items = Array.isArray(p.items) ? p.items.slice(0, 300) : [];
  if (!items.length) throw new Error('items is required');
  var s = ideasSheet_();
  var counters = { NOW: 0, NEXT: 0, LATER: 0 };
  var applied = 0, unknown = [];
  var now = nowIso_();
  items.forEach(function (it) {
    var id = str_(it && it.idea_id, 40).trim();
    if (!id) return;
    var rowIndex = findIdeaRow_(s, id);
    if (rowIndex < 0) { unknown.push(id); return; }
    var bucket = ideaEnum_(it, 'planning_bucket', IDEA_BUCKETS, 'LATER');
    var order = it.manual_order !== undefined && !isNaN(Number(it.manual_order)) ? Number(it.manual_order) : (counters[bucket] += 10);
    s.sheet.getRange(rowIndex, s.cols.planning_bucket).setValue(bucket);
    s.sheet.getRange(rowIndex, s.cols.manual_order).setValue(order);
    s.sheet.getRange(rowIndex, s.cols.updated_at).setValue(now);
    applied++;
  });
  return { applied: applied, unknown: unknown, updated_at: now };
}
