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
