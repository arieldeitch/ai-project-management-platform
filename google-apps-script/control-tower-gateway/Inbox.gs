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
