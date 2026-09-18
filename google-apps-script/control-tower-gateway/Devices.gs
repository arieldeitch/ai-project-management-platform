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
