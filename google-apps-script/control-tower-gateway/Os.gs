/**
 * OS alignment — is each managed project provably aligned with the canonical Ariel AI Operating System?
 *
 * The OS itself lives in Drive (OS Brain owns the rules). Control Tower only records EVIDENCE:
 *   * a project run posts an OS Access Receipt (action os_receipt) after it read the OS, identified the
 *     version / change marker and applied the rules;
 *   * the receipt is written into the project's OS columns on PROJECT_CONTROL_BOARD
 *     (Last OS Check, OS Version Seen, OS Change Marker, OS Evidence, OS Sync Action, OS Alignment);
 *   * the verdict is re-evaluated on every read against the canonical marker published in Script Properties
 *     (OS_CURRENT_CHANGE_MARKER, optional OS_CURRENT_VERSION), so an OS update flips everyone to VERSION_DRIFT
 *     until each project re-checks.
 *
 * Never inferred from commits, GitHub activity or a Control Tower check. Separate clock: last_os_check.
 */

function canonicalOsMarker_() {
  try {
    var props = PropertiesService.getScriptProperties();
    return { marker: str_(props.getProperty(OS_MARKER_PROPERTY), 120).trim(), version: str_(props.getProperty(OS_VERSION_PROPERTY), 80).trim() };
  } catch (e) {
    return { marker: '', version: '' };
  }
}

/**
 * Pure verdict from stored evidence + canonical marker. Explicit ACCESS_FAILED/NEVER_SEEN cells are kept.
 *   no check ever                     → NEVER_SEEN (or the explicit cell value when present)
 *   check + marker, canonical known   → CURRENT when equal, VERSION_DRIFT otherwise
 *   check + marker, canonical unknown → UNKNOWN (evidence exists, verdict cannot be computed yet)
 *   check without marker              → UNKNOWN
 */
function osVerdict_(p, canonical) {
  var stored = normalizeOsAlignment_(p.os_alignment);
  if (stored === 'ACCESS_FAILED') return { state: 'ACCESS_FAILED', action: p.os_sync_action || 'הפרויקט לא הצליח לגשת למערכת ההפעלה — לבדוק הרשאות/קישור ולהריץ בדיקת OS מחדש' };
  var checked = !!p.last_os_check;
  if (!checked) {
    // No evidence at all: an explicit UNKNOWN cell (Ariel's deliberate value) is respected; blank or
    // NEVER_SEEN → NEVER_SEEN; CURRENT/VERSION_DRIFT without a check is an unsupported claim → UNKNOWN.
    var state = stored === 'UNKNOWN' || stored === 'CURRENT' || stored === 'VERSION_DRIFT' ? 'UNKNOWN' : 'NEVER_SEEN';
    return { state: state, action: p.os_sync_action || 'עדיין אין ראיה שהפרויקט קרא את מערכת ההפעלה — נדרשת ריצה אחת עם בדיקת OS וקבלה (receipt)' };
  }
  var seen = str_(p.os_change_marker, 120).trim();
  if (!seen) return { state: 'UNKNOWN', action: p.os_sync_action || 'נרשמה בדיקת OS בלי סמן גרסה — להריץ שוב עם סמן השינוי של ה-OS' };
  if (!canonical.marker) return { state: 'UNKNOWN', action: 'הפרויקט דיווח על סמן ' + seen + ' — כדי לאמת יש להגדיר את סמן ה-OS הנוכחי ב-Control Tower' };
  if (seen === canonical.marker) return { state: 'CURRENT', action: '' };
  return { state: 'VERSION_DRIFT', action: 'הפרויקט ראה גרסת OS ' + seen + ' אבל הנוכחית היא ' + canonical.marker + ' — נדרשת ריצת סנכרון בפרויקט' };
}

/** Enrich a portfolio row in place (read-time evaluation; never writes to the board). */
function evaluateOsAlignment_(p) {
  var canonical = canonicalOsMarker_();
  var v = osVerdict_(p, canonical);
  p.os_alignment = v.state;
  if (!p.os_sync_action || v.state === 'CURRENT' || v.state === 'VERSION_DRIFT') p.os_sync_action = v.action;
  p.os_current_marker = canonical.marker;
  p.os_current_version = canonical.version;
  return p;
}

/**
 * OS Access Receipt intake (authenticated caller). Writes the project's OS columns; nothing else on the row.
 * Payload: project_id (required), checked_at?, os_version_seen?, os_change_marker (required unless access_failed),
 *          evidence_url | evidence_ref (required unless access_failed), applied? (default true), access_failed?, notes?
 */
function recordOsReceipt_(p) {
  var projectId = str_(p.project_id, 80).trim();
  if (!projectId) throw new Error('project_id is required');
  var projects = readPortfolio_();
  var target = null;
  projects.forEach(function (x) { if (x.id === projectId) target = x; });
  if (!target) throw new Error('unknown project_id');
  var map = resolveProjectColumns_();
  ['last_os_check', 'os_alignment'].forEach(function (f) {
    if (map[f] < 0) throw new Error('board column missing for ' + f + ' (add it to Projects or set PROJECTS_COLUMN_MAP)');
  });

  var accessFailed = truthy_(p.access_failed);
  var checkedAt = p.checked_at ? parseCellDate_(p.checked_at).iso : nowIso_();
  if (!checkedAt) throw new Error('checked_at is not a supported timestamp');
  if (Date.parse(checkedAt) > Date.now() + 5 * 60 * 1000) throw new Error('checked_at is in the future');
  var marker = str_(p.os_change_marker, 120).trim();
  var version = str_(p.os_version_seen, 80).trim();
  var evidence = str_(p.evidence_url || p.evidence_ref, 600).trim();
  if (!accessFailed) {
    if (!marker) throw new Error('os_change_marker is required');
    if (!evidence) throw new Error('evidence_url or evidence_ref is required');
    if (/^https?:\/\//i.test(evidence) === false && evidence.length < 8) throw new Error('evidence_ref too short');
  }
  var applied = p.applied === undefined ? true : truthy_(p.applied);
  var notes = str_(p.notes, 200).trim();

  var updated = {
    last_os_check: checkedAt,
    os_version_seen: version,
    os_change_marker: marker,
    os_evidence: (accessFailed ? 'ACCESS_FAILED' : (applied ? 'receipt' : 'receipt (rules not yet applied)')) + ' · ' + evidence + (notes ? ' · ' + notes : ''),
    os_alignment: accessFailed ? 'ACCESS_FAILED' : 'UNKNOWN',
    os_sync_action: ''
  };
  var verdict = osVerdict_({ os_alignment: updated.os_alignment, last_os_check: updated.last_os_check, os_change_marker: marker, os_sync_action: '' }, canonicalOsMarker_());
  updated.os_alignment = verdict.state;
  updated.os_sync_action = verdict.action;

  var sheet = openBoard_().getSheetByName(PROJECTS_SHEET);
  Object.keys(updated).forEach(function (field) {
    if (map[field] >= 0) sheet.getRange(target.board_row, map[field] + 1).setValue(updated[field]);
  });
  return { project_id: projectId, os_alignment: updated.os_alignment, last_os_check: checkedAt, os_change_marker: marker, os_sync_action: updated.os_sync_action };
}

/** Portfolio-wide OS alignment summary for health / Chief of Staff. */
function osAlignmentSummary_(projects) {
  var counts = {};
  OS_ALIGNMENT_STATES.forEach(function (s) { counts[s] = 0; });
  (projects || []).forEach(function (p) { if (p.role !== 'infrastructure') counts[p.os_alignment || 'UNKNOWN'] = (counts[p.os_alignment || 'UNKNOWN'] || 0) + 1; });
  var canonical = canonicalOsMarker_();
  return { counts: counts, os_current_marker_configured: !!canonical.marker, os_current_marker: canonical.marker, os_current_version: canonical.version };
}
