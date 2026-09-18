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
