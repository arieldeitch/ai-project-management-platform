/**
 * Ideas is the canonical idea incubator for Control Tower.
 * An idea stays here until it is promoted deliberately; it never becomes a project by accident.
 */
var IDEA_STAGES = ['INBOX', 'CLARIFY', 'SHAPE', 'VALIDATE', 'READY', 'PARKED', 'PROMOTED', 'ARCHIVED'];
var IDEA_ENUMS = {
  usage_frequency: ['ONE_OFF', 'OCCASIONAL', 'WEEKLY', 'DAILY'],
  urgency: ['LOW', 'MEDIUM', 'HIGH'],
  surface: ['MOBILE', 'WEB', 'AUTOMATION', 'AGENT', 'PROCESS', 'UNDECIDED'],
  automation_level: ['MANUAL', 'ASSISTED', 'AUTOMATIC', 'UNDECIDED']
};

function ideaValue_(p, key, max) { return str_(p[key], max || MAX_IDEA_TEXT).trim(); }
function ideaEnum_(p, key, allowed, fallback) {
  var value = ideaValue_(p, key, 40).toUpperCase();
  return allowed.indexOf(value) >= 0 ? value : fallback;
}
function ideaId_() { return 'IDEA-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }

function createIdea_(p) {
  var title = ideaValue_(p, 'title', 180);
  if (!title) throw new Error('title is required');
  var now = nowIso_();
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
    constraints: ideaValue_(p, 'constraints'), next_step: ideaValue_(p, 'next_step'), notes: ideaValue_(p, 'notes')
  };
  var sheet = ensureSheet_(IDEAS_SHEET, IDEA_HEADERS);
  sheet.appendRow(IDEA_HEADERS.map(function (h) { return row[h] || ''; }));
  return { item: row, row: sheet.getLastRow() };
}

function listIdeas_(limit) {
  var sheet = ensureSheet_(IDEAS_SHEET, IDEA_HEADERS);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, IDEA_HEADERS.length).getValues();
  var items = values.map(function (row) {
    var out = {};
    IDEA_HEADERS.forEach(function (h, i) { out[h] = h.indexOf('_at') > 0 ? cellIso_(row[i]) : str_(row[i], MAX_IDEA_TEXT); });
    out.maturity_score = ideaMaturity_(out);
    return out;
  }).filter(function (x) { return x.idea_id && x.title && x.stage !== 'ARCHIVED'; });
  items.sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); });
  return items.slice(0, limit);
}

function ideaMaturity_(x) {
  var keys = ['need', 'target_user', 'desired_outcome', 'core_functionality', 'usage_frequency', 'urgency', 'surface', 'automation_level', 'success_metric', 'next_step'];
  var filled = keys.filter(function (k) { return x[k] && x[k] !== 'UNDECIDED'; }).length;
  return Math.round(filled * 100 / keys.length);
}

function updateIdea_(p) {
  var id = ideaValue_(p, 'idea_id', 40);
  if (!id) throw new Error('idea_id is required');
  var sheet = ensureSheet_(IDEAS_SHEET, IDEA_HEADERS);
  if (sheet.getLastRow() < 2) throw new Error('idea not found');
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, IDEA_HEADERS.length).getValues();
  var rowIndex = -1;
  for (var i = 0; i < values.length; i++) if (String(values[i][0]) === id) { rowIndex = i + 2; break; }
  if (rowIndex < 0) throw new Error('idea not found');
  var editable = ['title', 'need', 'target_user', 'desired_outcome', 'core_functionality', 'data_needed', 'success_metric', 'constraints', 'next_step', 'notes'];
  editable.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(p, key)) sheet.getRange(rowIndex, IDEA_HEADERS.indexOf(key) + 1).setValue(ideaValue_(p, key, key === 'title' ? 180 : MAX_IDEA_TEXT));
  });
  Object.keys(IDEA_ENUMS).forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(p, key)) sheet.getRange(rowIndex, IDEA_HEADERS.indexOf(key) + 1).setValue(ideaEnum_(p, key, IDEA_ENUMS[key], 'UNDECIDED'));
  });
  if (Object.prototype.hasOwnProperty.call(p, 'stage')) sheet.getRange(rowIndex, IDEA_HEADERS.indexOf('stage') + 1).setValue(ideaEnum_(p, 'stage', IDEA_STAGES, 'INBOX'));
  sheet.getRange(rowIndex, IDEA_HEADERS.indexOf('updated_at') + 1).setValue(nowIso_());
  return { idea_id: id, updated_at: nowIso_() };
}
