// OS alignment: evidence-backed verdicts, receipt intake, status taxonomy, short description. No live Drive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = ['Config.gs', 'Portfolio.gs', 'Os.gs', 'Activity.gs', 'Code.gs'].map((f) => readFileSync(join(here, '..', f), 'utf8')).join('\n');

const HEADERS = ['ID', 'Project', 'Short Description', 'Lifecycle', 'RAG', 'Confidence', 'Objective', 'Current Milestone', 'Progress Evidence',
  'Next Action', 'Blocker / Dependency', 'Needs Ariel', 'Ariel Decision / Input', 'Risk / Drift', 'Last Meaningful Progress',
  'Last Control Check', 'Expected Cadence', 'Primary Link', 'OS Alignment', 'Last OS Check', 'OS Version Seen', 'OS Change Marker', 'OS Evidence', 'OS Sync Action'];
const H = (name) => HEADERS.indexOf(name);
const T_CHECK = new Date(Date.UTC(2026, 8, 19, 6, 0));

function projectRow(overrides) {
  const r = new Array(HEADERS.length).fill('');
  r[H('ID')] = overrides.id; r[H('Project')] = overrides.name; r[H('Lifecycle')] = overrides.lifecycle || 'Active'; r[H('RAG')] = overrides.rag === undefined ? 'GREEN' : overrides.rag;
  r[H('Short Description')] = overrides.desc || ''; r[H('Blocker / Dependency')] = overrides.blocker || ''; r[H('Needs Ariel')] = overrides.needs || 'No';
  r[H('Ariel Decision / Input')] = overrides.ask || ''; r[H('Risk / Drift')] = overrides.risk || ''; r[H('Last Control Check')] = T_CHECK;
  r[H('Last Meaningful Progress')] = overrides.progress || ''; r[H('OS Alignment')] = overrides.os || ''; r[H('Last OS Check')] = overrides.osCheck || '';
  r[H('OS Change Marker')] = overrides.marker || ''; r[H('OS Version Seen')] = overrides.osVersion || ''; r[H('OS Evidence')] = overrides.osEvidence || ''; r[H('OS Sync Action')] = overrides.osAction || '';
  return r;
}

function context(rows, props = {}) {
  const data = [HEADERS.slice(), ...rows.map((r) => r.slice())];
  const sheet = {
    _data: data, getLastRow: () => data.length, getLastColumn: () => HEADERS.length, getFrozenRows: () => 1, setFrozenRows: () => {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = data[r - 1 + i] || []; const seg = []; for (let j = 0; j < nc; j++) seg.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(seg); } return out; },
      setValue: (v) => { data[r - 1][c - 1] = v; return { setFontWeight: () => {} }; }, setValues: () => ({ setFontWeight: () => {} }), setFontWeight: () => {},
    }),
  };
  const ledger = { getLastRow: () => 1, getLastColumn: () => 12, getFrozenRows: () => 1, setFrozenRows: () => {}, getRange: () => ({ getValues: () => [[]], setValue: () => ({ setFontWeight() {} }), setValues: () => ({ setFontWeight() {} }), setFontWeight() {} }) };
  const ctx = {
    console: { log() {}, error() {} }, Date,
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => (n === 'Projects' ? sheet : n === 'ActivityLedger' || n === 'ActivitySources' ? ledger : null), insertSheet: () => ledger, getSheets: () => [], getName: () => 'PROJECT_CONTROL_BOARD' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: () => {} }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'x' }, computeDigest: () => [1], base64EncodeWebSafe: () => 'AQ' },
    UrlFetchApp: { fetch: () => { throw new Error('offline'); } }, DriveApp: {},
  };
  vm.createContext(ctx); vm.runInContext(src, ctx); ctx._sheet = sheet; return ctx;
}

// ---------- verdict matrix ----------

test('no OS check ever → NEVER_SEEN (blank) / UNKNOWN (explicit cell) — never CURRENT without evidence', () => {
  const ctx = context([
    projectRow({ id: 'P-001', name: 'Ariel Life OS', os: '' }),
    projectRow({ id: 'P-002', name: 'Household OS', os: 'UNKNOWN' }),
    projectRow({ id: 'P-003', name: 'Personal News Radar', os: 'CURRENT' }), // claim without a check
    projectRow({ id: 'P-004', name: 'Tom AI Learning', os: 'ACCESS_FAILED' }),
  ], { OS_CURRENT_CHANGE_MARKER: 'OS-2026-09-19' });
  const by = Object.fromEntries(ctx.readPortfolio_().map((p) => [p.id, p]));
  assert.equal(by['P-001'].os_alignment, 'NEVER_SEEN');
  assert.equal(by['P-002'].os_alignment, 'UNKNOWN');
  assert.equal(by['P-003'].os_alignment, 'UNKNOWN', 'CURRENT cell without a check is an unsupported claim');
  assert.equal(by['P-004'].os_alignment, 'ACCESS_FAILED');
  assert.match(by['P-001'].os_sync_action, /נדרשת ריצה אחת/);
});

test('check + marker: CURRENT only when equal to the canonical marker, VERSION_DRIFT otherwise, UNKNOWN when no canonical marker', () => {
  const rows = [
    projectRow({ id: 'P-005', name: 'Nutrition App', osCheck: '2026-09-19 08:00', marker: 'OS-2026-09-19', os: 'UNKNOWN' }),
    projectRow({ id: 'P-006', name: 'Chief of Staff', osCheck: '2026-09-18 08:00', marker: 'OS-2026-09-10', os: 'CURRENT' }),
    projectRow({ id: 'P-002', name: 'Household OS', osCheck: '2026-09-19 08:00', marker: '', os: 'UNKNOWN' }),
  ];
  let by = Object.fromEntries(context(rows, { OS_CURRENT_CHANGE_MARKER: 'OS-2026-09-19', OS_CURRENT_VERSION: '2.3' }).readPortfolio_().map((p) => [p.id, p]));
  assert.equal(by['P-005'].os_alignment, 'CURRENT');
  assert.equal(by['P-005'].os_sync_action, '');
  assert.equal(by['P-006'].os_alignment, 'VERSION_DRIFT', 'a stale CURRENT cell is re-evaluated against the new canonical marker');
  assert.match(by['P-006'].os_sync_action, /OS-2026-09-10.*OS-2026-09-19.*סנכרון/);
  assert.equal(by['P-002'].os_alignment, 'UNKNOWN');
  assert.equal(by['P-005'].os_current_version, '2.3');
  by = Object.fromEntries(context(rows, {}).readPortfolio_().map((p) => [p.id, p]));
  assert.equal(by['P-005'].os_alignment, 'UNKNOWN', 'without a canonical marker no verdict is possible');
  assert.match(by['P-005'].os_sync_action, /להגדיר את סמן/);
});

test('GitHub / ledger activity never changes OS alignment', () => {
  const ctx = context([projectRow({ id: 'P-002', name: 'Household OS', os: 'UNKNOWN', progress: '2026-09-19 07:00' })], { OS_CURRENT_CHANGE_MARKER: 'OS-2026-09-19' });
  ctx.latestActivityByProject_ = () => ({ 'P-002': { any: { occurred_at: '2026-09-19T08:00:00.000Z', activity_type: 'progress', source_type: 'github_pr', summary: 'PR merged', evidence_url: 'https://x', evidence_level: 'OBSERVED' }, meaningful: null, byClass: { github: { occurred_at: '2026-09-19T08:00:00.000Z', activity_type: 'progress', source_type: 'github_pr', summary: 'PR merged', evidence_url: 'https://x', evidence_level: 'OBSERVED' } } } });
  ctx.automationPolicyByProject_ = () => ({});
  const [p] = ctx.enrichPortfolioWithActivity_(ctx.readPortfolio_());
  assert.equal(p.last_meaningful_progress, '2026-09-19T08:00:00.000Z', 'activity clock moved');
  assert.equal(p.os_alignment, 'UNKNOWN', 'OS clock did not');
  assert.equal(p.last_os_check, '');
});

// ---------- receipt intake ----------

test('os_receipt writes only the OS columns and yields an evidence-backed verdict', () => {
  const ctx = context([projectRow({ id: 'P-006', name: 'Chief of Staff', os: 'UNKNOWN', rag: 'GREEN', desc: 'Chief of Staff — הדלת לכל האקוסיסטם' })], { OS_CURRENT_CHANGE_MARKER: 'OS-2026-09-19' });
  const r = ctx.recordOsReceipt_({ project_id: 'P-006', checked_at: '2026-09-19 09:30', os_version_seen: '2.3', os_change_marker: 'OS-2026-09-19', evidence_url: 'https://github.com/arieldeitch/chief-of-staff/blob/main/docs/os-receipts/2026-09-19.md', applied: true });
  assert.equal(r.os_alignment, 'CURRENT');
  const row = ctx._sheet._data[1];
  assert.equal(row[H('OS Alignment')], 'CURRENT');
  assert.equal(row[H('OS Change Marker')], 'OS-2026-09-19');
  assert.equal(row[H('OS Version Seen')], '2.3');
  assert.match(row[H('OS Evidence')], /^receipt · https:\/\/github.com/);
  assert.equal(row[H('OS Sync Action')], '');
  assert.equal(row[H('RAG')], 'GREEN', 'curated status untouched');
  assert.equal(row[H('Short Description')], 'Chief of Staff — הדלת לכל האקוסיסטם');
  const after = ctx.readPortfolio_()[0];
  assert.equal(after.os_alignment, 'CURRENT');
  assert.equal(after.short_description, 'Chief of Staff — הדלת לכל האקוסיסטם');
  // drift receipt
  const d = ctx.recordOsReceipt_({ project_id: 'P-006', os_change_marker: 'OS-2026-09-01', evidence_ref: 'run-report-2026-09-19' });
  assert.equal(d.os_alignment, 'VERSION_DRIFT');
  // access failed receipt
  const f = ctx.recordOsReceipt_({ project_id: 'P-006', access_failed: true, notes: 'drive 403' });
  assert.equal(f.os_alignment, 'ACCESS_FAILED');
  assert.match(ctx._sheet._data[1][H('OS Evidence')], /^ACCESS_FAILED/);
});

test('os_receipt validation: unknown project, missing marker/evidence, future time', () => {
  const ctx = context([projectRow({ id: 'P-001', name: 'Ariel Life OS' })], {});
  assert.throws(() => ctx.recordOsReceipt_({ project_id: 'P-404', os_change_marker: 'x', evidence_ref: 'r' }), /unknown project_id/);
  assert.throws(() => ctx.recordOsReceipt_({ project_id: 'P-001', evidence_ref: 'run report' }), /os_change_marker is required/);
  assert.throws(() => ctx.recordOsReceipt_({ project_id: 'P-001', os_change_marker: 'OS-1' }), /evidence_url or evidence_ref/);
  assert.throws(() => ctx.recordOsReceipt_({ project_id: 'P-001', os_change_marker: 'OS-1', evidence_ref: 'run-report-1', checked_at: '2099-01-01' }), /future/);
  const ok = ctx.recordOsReceipt_({ project_id: 'P-001', os_change_marker: 'OS-1', evidence_ref: 'run-report-2026-09-19' });
  assert.equal(ok.os_alignment, 'UNKNOWN', 'no canonical marker configured → evidence recorded, verdict pending');
});

// ---------- status taxonomy + short description ----------

test('status bucket is deterministic: NEEDS_ARIEL › BLOCKED › AT_RISK › WATCH › OK, with a Hebrew reason', () => {
  const ctx = context([
    projectRow({ id: 'P-1', name: 'a', needs: 'Yes', ask: 'לבחור מודל', rag: 'RED', blocker: 'x' }),
    projectRow({ id: 'P-2', name: 'b', lifecycle: 'USER TEST REQUIRED', rag: 'GREEN' }),
    projectRow({ id: 'P-3', name: 'c', blocker: 'אין החלטה', rag: 'RED' }),
    projectRow({ id: 'P-4', name: 'd', rag: 'RED', risk: 'סחיפה' }),
    projectRow({ id: 'P-5', name: 'e', rag: 'YELLOW' }),
    projectRow({ id: 'P-6', name: 'f', rag: 'GREEN' }),
    projectRow({ id: 'P-7', name: 'g', rag: '' }),
  ], {});
  const by = Object.fromEntries(ctx.readPortfolio_().map((p) => [p.id, [p.status_bucket, p.status_reason]]));
  assert.equal(by['P-1'][0], 'NEEDS_ARIEL'); assert.match(by['P-1'][1], /^צריך אותך: לבחור מודל/);
  assert.equal(by['P-2'][0], 'NEEDS_ARIEL'); assert.match(by['P-2'][1], /בדיקה שלך/);
  assert.equal(by['P-3'][0], 'BLOCKED'); assert.match(by['P-3'][1], /^חסום: אין החלטה/);
  assert.equal(by['P-4'][0], 'AT_RISK'); assert.match(by['P-4'][1], /סחיפה/);
  assert.equal(by['P-5'][0], 'WATCH');
  assert.equal(by['P-6'][0], 'OK');
  assert.equal(by['P-7'][0], 'WATCH'); assert.match(by['P-7'][1], /לא הוגדר רמזור/);
});

test('health carries the OS summary and the canonical-marker flag (never the token)', () => {
  const ctx = context([projectRow({ id: 'P-1', name: 'a', os: 'UNKNOWN' }), projectRow({ id: 'P-2', name: 'b', osCheck: '2026-09-19', marker: 'M' })], { OS_CURRENT_CHANGE_MARKER: 'M' });
  const h = ctx.osHealth_();
  assert.equal(h.counts.UNKNOWN, 1);
  assert.equal(h.counts.CURRENT, 1);
  assert.equal(h.os_current_marker_configured, true);
  assert.equal(h.os_current_marker, 'M');
});
