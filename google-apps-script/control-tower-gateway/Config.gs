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
var IDEAS_SHEET = 'Ideas';

var INBOX_HEADERS = ['received_at', 'source', 'status', 'evidence_level', 'report_text', 'project_hint', 'device_id', 'app_version', 'processed_at', 'notes'];
var DEVICES_HEADERS = ['token', 'device_id', 'device_label', 'platform', 'app_version', 'registered_at', 'last_seen_at', 'active'];
var PUSH_STATE_HEADERS = ['project_key', 'last_rag', 'last_needs_ariel', 'last_lifecycle', 'last_event', 'last_event_at', 'updated_at'];
var ACTIVITY_SOURCE_HEADERS = ['project_id', 'project_name', 'source_type', 'locator', 'branch', 'include_automation', 'enabled', 'last_poll_at', 'last_seen_at', 'notes'];
var ACTIVITY_LEDGER_HEADERS = ['event_id', 'occurred_at', 'observed_at', 'project_id', 'project_name', 'source_type', 'source_locator', 'activity_type', 'summary', 'evidence_url', 'evidence_level', 'metadata_json'];
var IDEA_HEADERS = ['idea_id', 'created_at', 'updated_at', 'title', 'stage', 'need', 'target_user', 'desired_outcome', 'core_functionality', 'usage_frequency', 'urgency', 'surface', 'automation_level', 'data_needed', 'success_metric', 'constraints', 'next_step', 'notes', 'planning_bucket', 'manual_order'];
var IDEA_BUCKETS = ['NOW', 'NEXT', 'LATER'];

var MAX_BODY_BYTES = 64 * 1024;
var MAX_REPORT_CHARS = 20000;
var MAX_IDEA_TEXT = 4000;

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
  short_description: ['short description', 'description', 'purpose', 'one liner', 'תיאור קצר', 'תיאור'],
  // Presentation only: the Hebrew name Ariel sees. The canonical (English) name stays the integration key.
  display_name: ['display name', 'hebrew name', 'שם תצוגה', 'שם בעברית'],
  // OS alignment (evidence-backed; never inferred from activity). Written only by os_receipt / evaluation.
  os_alignment: ['os alignment', 'os status', 'יישור os'],
  last_os_check: ['last os check', 'os check', 'בדיקת os אחרונה'],
  os_version_seen: ['os version seen', 'os version', 'גרסת os'],
  os_change_marker: ['os change marker', 'os marker', 'change marker', 'סמן שינוי os'],
  os_evidence: ['os evidence', 'ראיית os'],
  os_sync_action: ['os sync action', 'os action', 'פעולת סנכרון os'],
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
var GATEWAY_CONTRACT_VERSION = 5;

// OS alignment states (canonical OS lives in Drive; Control Tower only records evidence-backed alignment).
var OS_ALIGNMENT_STATES = ['CURRENT', 'VERSION_DRIFT', 'NEVER_SEEN', 'ACCESS_FAILED', 'UNKNOWN'];
// Script Properties OS_CURRENT_CHANGE_MARKER / OS_CURRENT_VERSION hold the canonical marker published by the OS owner.
var OS_MARKER_PROPERTY = 'OS_CURRENT_CHANGE_MARKER';
var OS_VERSION_PROPERTY = 'OS_CURRENT_VERSION';
