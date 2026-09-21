// UX-review fixture gateway. Emulates the Apps Script contract (v5) on http://localhost:8787/exec so the
// app can be reviewed on an emulator without the real token. FIXTURE DATA ONLY — never portfolio truth.
//
//   node control-tower-android/tools/review-gateway.mjs
//   CT_REVIEW_GATEWAY_URL=http://10.0.2.2:8787/exec CT_GATEWAY_TOKEN=<any 32+ character review string> gradle :app:assembleDebug
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const LATENCY_MS = Number(process.env.LATENCY_MS || 0); // simulate a slow gateway to prove taps never wait for it
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
  { id: 'P-007', name: 'Fitness App Recovery', lifecycle: 'Active', rag: 'RED', confidence: 'LOW',
    objective: 'Recovery and revalidation of a previously built fitness app so it becomes a real, usable product.', milestone: 'Locate canonical repo',
    progress_evidence: 'Control delta: no canonical repo confirmed yet.', next_action: 'Confirm the exact existing fitness app/repository and its current state.', blocker: 'Control delta: no canonical repo confirmed yet.', needs_ariel: true, ariel_input: 'Confirm the exact existing fitness app/repository to recover.', risk: 'Run the existing owner/family-device checklist and record results.',
    last_meaningful_progress: iso(2 * D), last_control_check: iso(3 * H), expected_cadence: 'weekly', link: '' },
  { id: 'P-008', name: 'Irish Citizenship & Passport', lifecycle: 'Active', rag: 'GREEN', confidence: 'MEDIUM',
    objective: 'Personal bureaucracy/document control for the Irish citizenship path.', milestone: 'Document map',
    progress_evidence: '', next_action: 'Provide/obtain the aunt document map and the birth certificate scan.', blocker: '', needs_ariel: true, ariel_input: 'Provide/obtain the aunt document map.', risk: '',
    last_meaningful_progress: iso(5 * D), last_control_check: iso(3 * H), expected_cadence: 'weekly', link: '' },
  { id: 'P-003', name: 'Personal News Radar', lifecycle: 'Active', rag: 'GREEN', confidence: 'HIGH',
    objective: 'תקציר יומי מסונן', milestone: 'תקציר בוקר יציב',
    progress_evidence: '', next_action: 'להוסיף מקור חדשות אחד', blocker: '', needs_ariel: false, ariel_input: '', risk: '',
    last_meaningful_progress: '', last_meaningful_progress_raw: 'ongoing', last_control_check: iso(3 * H), expected_cadence: '', link: '' },
].map((p) => {
  const meaningful = p.last_meaningful_progress || '';
  const isNews = p.id === 'P-003';
  return {
    role: 'project',
    key: p.name.toLowerCase(),
    last_check: p.last_control_check,
    user_test_required: /user test/i.test(p.lifecycle),
    last_meaningful_progress_raw: '',
    last_control_check_raw: '',
    ...p,
    latest_activity_at: isNews ? iso(5 * 60_000) : meaningful,
    latest_activity_type: isNews ? 'automation' : (meaningful ? 'progress' : ''),
    latest_activity_source: isNews ? 'github_event' : (meaningful ? 'project_board' : ''),
    latest_activity_summary: isNews ? 'refresh feed snapshot' : (p.progress_evidence || ''),
    latest_meaningful_activity_at: isNews ? iso(2 * H) : meaningful,
    latest_meaningful_activity_type: isNews ? 'progress' : (meaningful ? 'progress' : ''),
    latest_meaningful_activity_source: isNews ? 'github_event' : (meaningful ? 'project_board' : ''),
    latest_meaningful_activity_summary: isNews ? 'source-quality hardening' : (p.progress_evidence || ''),
    ...v5(p),
  };
});

// Contract 5 fields (fixture): short description, status bucket, OS alignment (evidence-based, never from activity).
function v5(p) {
  const short = { 'P-005': 'אפליקציית תזונה משפחתית', 'P-002': 'אפליקציית ניהול בית', 'P-004': 'לימוד AI עם תום', 'P-001': 'סקירה שבועית ואנרגיה', 'P-006': 'תמונת יום אחת מכל הפרויקטים', 'P-003': 'תקציר חדשות יומי', 'P-007': 'Fitness app recovery', 'P-008': 'Irish passport process' }[p.id] || '';
  const os = {
    'P-006': { os_alignment: 'CURRENT', last_os_check: iso(2 * D), os_version_seen: '2026.09.2', os_change_marker: 'OS-2026-09-17', os_evidence: 'OS Access Receipt · https://drive.google.com/drive/folders/fixture-receipt-p006', os_sync_action: '' },
    'P-002': { os_alignment: 'VERSION_DRIFT', last_os_check: iso(20 * D), os_version_seen: '2026.08.4', os_change_marker: 'OS-2026-08-30', os_evidence: 'OS Access Receipt 30/08/2026', os_sync_action: 'להריץ סנכרון OS בפרויקט ולרשום קבלה חדשה' },
    'P-005': { os_alignment: 'ACCESS_FAILED', last_os_check: iso(3 * D), os_version_seen: '', os_change_marker: '', os_evidence: 'run report: Drive folder not shared with the agent', os_sync_action: 'לבדוק שיתוף של תיקיית ה-OS לפרויקט' },
  }[p.id] || { os_alignment: p.id === 'P-003' ? 'NEVER_SEEN' : 'UNKNOWN', last_os_check: '', os_version_seen: '', os_change_marker: '', os_evidence: '', os_sync_action: p.id === 'P-003' ? 'להריץ בדיקת OS ראשונה ולרשום קבלה' : '' };
  const bucket = (p.needs_ariel || /user test/i.test(p.lifecycle)) ? 'NEEDS_ARIEL' : p.blocker ? 'BLOCKED' : p.rag === 'RED' ? 'AT_RISK' : p.rag === 'GREEN' ? 'OK' : 'WATCH';
  const reason = { NEEDS_ARIEL: /user test/i.test(p.lifecycle) ? 'מחכה לבדיקה שלך בטלפון' : 'צריך אותך: ' + p.ariel_input, BLOCKED: 'חסום: ' + p.blocker, AT_RISK: 'אדום בלוח: ' + (p.risk || 'דורש טיפול'), OK: 'ירוק בלוח — אין חסם ואין החלטה פתוחה', WATCH: 'צהוב בלוח — במעקב' }[bucket];
  return { short_description: short, status_bucket: bucket, status_reason: reason, os_current_marker: 'OS-2026-09-17', ...os };
}

const ideas = [
  { idea_id: 'IDEA-0001', title: 'התראת בוקר אחת על כל הפרויקטים', stage: 'SHAPE', planning_bucket: 'NOW', manual_order: 10, need: 'במקום לפתוח חמישה מסכים, לקבל שורה אחת בבוקר', next_step: 'להגדיר מה נכנס לשורה', urgency: 'HIGH', surface: 'CONTROL_TOWER', maturity_score: 60, updated_at: iso(2 * D) },
  { idea_id: 'IDEA-0002', title: 'ייבוא קבלות מהמייל לתזונה', stage: 'CLARIFY', planning_bucket: 'NOW', manual_order: 20, need: 'ידני מדי היום', next_step: '', urgency: 'MEDIUM', surface: 'UNDECIDED', maturity_score: 30, updated_at: iso(5 * D) },
  { idea_id: 'IDEA-0003', title: 'סיכום שבועי קולי לתום', stage: 'INBOX', planning_bucket: 'NEXT', manual_order: 10, need: '', next_step: '', urgency: 'LOW', surface: 'UNDECIDED', maturity_score: 10, updated_at: iso(9 * D) },
  { idea_id: 'IDEA-0004', title: 'מדד אנרגיה בסקירה', stage: 'VALIDATE', planning_bucket: 'LATER', manual_order: 10, need: 'לראות קשר בין שינה לתפוקה', next_step: 'שבועיים של רישום ידני', urgency: 'LOW', surface: 'ARIEL_LIFE_OS', maturity_score: 75, updated_at: iso(12 * D) },
  { idea_id: 'IDEA-0005', title: 'רדאר חדשות בעברית בלבד', stage: 'INBOX', planning_bucket: 'LATER', manual_order: 20, need: '', next_step: '', urgency: 'LOW', surface: 'UNDECIDED', maturity_score: 5, updated_at: iso(20 * D) },
];
const bucketRank = { NOW: 0, NEXT: 1, LATER: 2 };
const sortIdeas = () => ideas.sort((a, b) => (bucketRank[a.planning_bucket] - bucketRank[b.planning_bucket]) || (a.manual_order - b.manual_order) || b.updated_at.localeCompare(a.updated_at));

const inbox = [
  { received_at: iso(40 * 60_000), source: 'agent_report', status: 'NEW', evidence_level: 'REPORTED', report_text: 'EXTERNAL_PROJECT_REPORT_V1 [Nutrition App] dogfood suite failed: 4 tests failing, run 8873 at ' + iso(40 * 60_000), project_hint: 'P-005', processed_at: '', notes: '' },
  { received_at: iso(3 * H), source: 'agent_report', status: 'NEW', evidence_level: 'REPORTED', report_text: 'EXTERNAL_PROJECT_REPORT_V1 [Nutrition App] dogfood suite failed: 3 tests failing, run 8871 at ' + iso(3 * H), project_hint: 'P-005', processed_at: '', notes: '' },
  { received_at: iso(9 * H), source: 'agent_report', status: 'NEW', evidence_level: 'REPORTED', report_text: 'Household OS gateway sync failed: 401 unauthorized (token rotated?)', project_hint: 'P-002', processed_at: '', notes: '' },
  { received_at: iso(20 * 60_000), source: 'share', status: 'REPORTED', evidence_level: 'REPORTED', report_text: 'EXTERNAL_PROJECT_REPORT_V1\nTom AI Learning: גרסה 1.2 נבנתה, ממתינה לבדיקה בטלפון.', project_hint: '', processed_at: '', notes: '' },
  { received_at: iso(26 * H), source: 'deputy_command', status: 'VERIFIED', evidence_level: 'VERIFIED', report_text: 'בדוק מה תקוע', project_hint: '', processed_at: iso(25 * H), notes: 'Nutrition App תקוע על מודל נתונים' },
];
const activity = [
  { project_key: 'nutrition app', event: 'project_red', rag: 'RED', lifecycle: 'Active', occurred_at: iso(3 * D) },
  { project_key: 'tom ai learning', event: 'user_test_required', rag: 'GREEN', lifecycle: 'USER TEST REQUIRED', occurred_at: iso(2 * D) },
];

const handlers = {
  health: () => ({ spreadsheet_title: 'PROJECT_CONTROL_BOARD (fixture)', tabs: ['Projects', 'Connections', 'MobileInbox', 'MobileDevices', 'MobilePushState', 'ActivitySources', 'ActivityLedger'], projects_rows: 8, mobile_tabs_ready: true, resolved_columns: {}, unresolved_columns: [], active_devices: 1, fcm_configured: true, scanner_trigger_installed: true, activity: { sources_enabled: 6, ledger_events: 12, latest_observed_activity: iso(5 * 60_000) }, contract_version: 5, os: { os_current_marker_configured: true, os_current_marker: 'OS-2026-09-17', aligned: 1, needs_action: 5 }, server_time: new Date().toISOString() }),
  portfolio: () => ({ projects, snapshot_at: new Date().toISOString(), contract_version: 5 }),
  ideas: () => ({ items: sortIdeas().slice() }),
  create_idea: (b) => { const i = { idea_id: 'IDEA-' + String(ideas.length + 1).padStart(4, '0'), title: b.title || '', stage: 'INBOX', planning_bucket: b.planning_bucket || 'LATER', manual_order: 1000, need: b.need || '', next_step: '', urgency: 'MEDIUM', surface: 'UNDECIDED', maturity_score: 0, updated_at: new Date().toISOString() }; ideas.push(i); return { idea: i }; },
  update_idea: (b) => { const i = ideas.find((x) => x.idea_id === b.idea_id); if (i) { for (const k of ['stage', 'planning_bucket', 'manual_order', 'title', 'need', 'next_step']) if (b[k] !== undefined) i[k] = b[k]; i.updated_at = new Date().toISOString(); } return { idea: i || null }; },
  reorder_ideas: (b) => { let n = 0; for (const it of b.items || []) { const i = ideas.find((x) => x.idea_id === it.idea_id); if (i) { i.planning_bucket = it.planning_bucket; i.manual_order = it.manual_order; n++; } } return { updated: n }; },
  os_receipt: () => ({ recorded: false, error: 'fixture' }),
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
  req.on('end', () => setTimeout(() => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch {}
    const action = body.action;
    const h = handlers[action];
    const payload = req.method !== 'POST' ? { ok: false, error: 'post_only', status: 405 }
      : !h ? { ok: false, error: 'unknown_action', status: 400 }
      : { ...h(body), ok: true, action, gateway_version: '0.10.0-fixture', contract_version: 5, status: 200 };
    console.log(new Date().toISOString(), req.method, action ?? '-', payload.status);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  }, LATENCY_MS));
}).listen(PORT, () => console.log(`review gateway (fixture data) on http://localhost:${PORT}/exec`));
