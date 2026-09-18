// UX-review fixture gateway. Emulates the Apps Script contract (v2) on http://localhost:8787/exec so the
// app can be reviewed on an emulator without the real token. FIXTURE DATA ONLY — never portfolio truth.
//
//   node control-tower-android/tools/review-gateway.mjs
//   CT_REVIEW_GATEWAY_URL=http://10.0.2.2:8787/exec CT_GATEWAY_TOKEN=<any 32+ character review string> gradle :app:assembleDebug
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const now = Date.now();
const H = 3_600_000, D = 24 * H;
const iso = (msAgo) => new Date(now - msAgo).toISOString();

// Six canonical rows mirroring the live board's SHAPE (names per the 2026-09-18 task), fixture values.
const projects = [
  { id: 'P-005', name: 'Nutrition App', lifecycle: 'Active', rag: 'RED', confidence: 'LOW',
    objective: 'מקור אמת אחד לארוחות ולתזונה של המשפחה', milestone: 'ייצוא שבועי יציב ל-Household OS',
    progress_evidence: 'הייצוא נכשל פעמיים השבוע; נמצאה סיבה בסכימת הנתונים', next_action: 'לבחור מודל נתונים סופי ולתקן את הייצוא',
    blocker: 'אין החלטה על מודל הנתונים', needs_ariel: true, ariel_input: 'לבחור בין סכימת "ארוחה" לסכימת "מרכיב" כבסיס',
    risk: 'סחיפה: שבועיים בלי התקדמות אמיתית', last_meaningful_progress: iso(16 * D), last_control_check: iso(3 * H), expected_cadence: '2x/week', link: 'https://example.invalid/nutrition' },
  { id: 'P-002', name: 'Household OS', lifecycle: 'Active', rag: 'YELLOW', confidence: 'MEDIUM',
    objective: 'לאוטומט את השבוע המשפחתי מקצה לקצה', milestone: 'נעילת פורמט התפריט השבועי',
    progress_evidence: 'טיוטת לוח שבוע נוצרה אוטומטית', next_action: 'לאשר את פורמט התפריט ולהריץ שבוע מלא',
    blocker: '', needs_ariel: true, ariel_input: 'לאשר את פורמט התפריט (טבלה או רשימה)',
    risk: '', last_meaningful_progress: iso(30 * H), last_control_check: iso(3 * H), expected_cadence: 'daily', link: '' },
  { id: 'P-004', name: 'Tom AI Learning', lifecycle: 'USER TEST REQUIRED', rag: 'GREEN', confidence: 'MEDIUM',
    objective: 'מפגשי למידה מסתגלים לתום', milestone: 'גרסה 1.2 מוכנה לבדיקה בטלפון',
    progress_evidence: 'APK חדש נבנה ונשלח', next_action: 'להתקין את הגרסה ולבדוק מפגש אחד עם תום',
    blocker: '', needs_ariel: false, ariel_input: '', risk: '',
    last_meaningful_progress: iso(2 * D + 5 * H), last_control_check: iso(3 * H), expected_cadence: 'weekly', link: 'https://example.invalid/tom' },
  { id: 'P-001', name: 'Ariel Life OS', lifecycle: 'Active', rag: 'GREEN', confidence: 'HIGH',
    objective: 'מערכת הפעלה אחת ורגועה לחיים ולעבודה', milestone: 'לולאת סקירה שבועית רצה שלושה שבועות ברצף',
    progress_evidence: 'סקירה שבועית הושלמה ונרשמה', next_action: 'להוסיף את מדד האנרגיה לסקירה',
    blocker: '', needs_ariel: false, ariel_input: '', risk: '',
    last_meaningful_progress: iso(52 * 60_000), last_control_check: iso(3 * H), expected_cadence: 'weekly', link: '' },
  { id: 'P-006', name: 'Chief of Staff', lifecycle: 'Active', rag: 'GREEN', confidence: 'HIGH',
    objective: 'דלת כניסה אחת ורגועה לכל האקוסיסטם', milestone: 'קריאה חיה מ-Control Tower',
    progress_evidence: 'קריאה חיה אומתה מול השער', next_action: 'לסקור את מסך "היום" עם נתונים חיים',
    blocker: '', needs_ariel: false, ariel_input: '', risk: '',
    last_meaningful_progress: '', last_meaningful_progress_raw: 'VERIFIED 2026-09-18 12:03: live read confirmed against the gateway', last_control_check: iso(3 * H), expected_cadence: 'as needed', link: '' },
  { id: 'P-003', name: 'Personal News Radar', lifecycle: 'Active', rag: 'GREEN', confidence: 'HIGH',
    objective: 'תקציר יומי מסונן', milestone: 'תקציר בוקר יציב',
    progress_evidence: '', next_action: 'להוסיף מקור חדשות אחד', blocker: '', needs_ariel: false, ariel_input: '', risk: '',
    last_meaningful_progress: '', last_meaningful_progress_raw: 'ongoing', last_control_check: iso(3 * H), expected_cadence: '', link: '' },
].map((p) => ({ role: 'project', key: p.name.toLowerCase(), last_check: p.last_control_check, user_test_required: /user test/i.test(p.lifecycle), last_meaningful_progress_raw: '', last_control_check_raw: '', ...p }));

const inbox = [
  { received_at: iso(20 * 60_000), source: 'share', status: 'REPORTED', evidence_level: 'REPORTED', report_text: 'EXTERNAL_PROJECT_REPORT_V1\nTom AI Learning: גרסה 1.2 נבנתה, ממתינה לבדיקה בטלפון.', project_hint: '', processed_at: '', notes: '' },
  { received_at: iso(26 * H), source: 'deputy_command', status: 'VERIFIED', evidence_level: 'VERIFIED', report_text: 'בדוק מה תקוע', project_hint: '', processed_at: iso(25 * H), notes: 'Nutrition App תקוע על מודל נתונים' },
];
const activity = [
  { project_key: 'nutrition app', event: 'project_red', rag: 'RED', lifecycle: 'Active', occurred_at: iso(3 * D) },
  { project_key: 'tom ai learning', event: 'user_test_required', rag: 'GREEN', lifecycle: 'USER TEST REQUIRED', occurred_at: iso(2 * D) },
];

const handlers = {
  health: () => ({ spreadsheet_title: 'PROJECT_CONTROL_BOARD (fixture)', tabs: ['Projects', 'Connections', 'MobileInbox', 'MobileDevices', 'MobilePushState'], projects_rows: 6, mobile_tabs_ready: true, resolved_columns: {}, unresolved_columns: [], active_devices: 1, fcm_configured: true, scanner_trigger_installed: true, contract_version: 2, server_time: new Date().toISOString() }),
  portfolio: () => ({ projects, snapshot_at: new Date().toISOString(), contract_version: 2 }),
  inbox: () => ({ items: inbox }),
  submit_report: (b) => { inbox.unshift({ received_at: new Date().toISOString(), source: b.source || 'manual', status: 'REPORTED', evidence_level: 'REPORTED', report_text: b.report_text || '', project_hint: '', processed_at: '', notes: '' }); return { received_at: new Date().toISOString(), status: 'REPORTED', row: inbox.length + 1 }; },
  register_device: () => ({ registered: true, row: 2, active_devices: 1 }),
  unregister_device: () => ({ unregistered: true, active_devices: 0 }),
  test_push: () => ({ sent: 1, failed: 0, fcm_configured: true }),
  activity: () => ({ items: activity }),
};

createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch {}
    const action = body.action;
    const h = handlers[action];
    const payload = req.method !== 'POST' ? { ok: false, error: 'post_only', status: 405 }
      : !h ? { ok: false, error: 'unknown_action', status: 400 }
      : { ...h(body), ok: true, action, gateway_version: '0.6.0-fixture', contract_version: 2, status: 200 };
    console.log(new Date().toISOString(), req.method, action ?? '-', payload.status);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  });
}).listen(PORT, () => console.log(`review gateway (fixture data) on http://localhost:${PORT}/exec`));
