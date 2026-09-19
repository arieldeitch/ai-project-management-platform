// Deterministic tests for the Projects → portfolio mapping (contract v2).
// Run: node --test google-apps-script/control-tower-gateway/test
// The .gs files are plain V8 JavaScript; Apps Script globals are stubbed just enough for the mapper.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = ['Config.gs', 'Portfolio.gs', 'Code.gs'].map((f) => readFileSync(join(here, '..', f), 'utf8')).join('\n');

// Header row of the live PROJECT_CONTROL_BOARD as documented for this run (names only; values are test fixtures).
const HEADERS = ['ID', 'Project', 'Lifecycle', 'RAG', 'Confidence', 'Objective', 'Current Milestone', 'Progress Evidence',
  'Next Action', 'Blocker / Dependency', 'Needs Ariel', 'Ariel Input', 'Risk / Drift', 'Last Meaningful Progress',
  'Last Control Check', 'Expected Cadence', 'Primary Link'];

function makeContext(rows, overrideMap) {
  const sheet = {
    getLastColumn: () => HEADERS.length,
    getLastRow: () => rows.length + 1,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        if (r === 1) return [HEADERS.slice(c - 1, c - 1 + nc)];
        return rows.slice(r - 2, r - 2 + nr).map((row) => row.slice(c - 1, c - 1 + nc));
      },
    }),
  };
  const ctx = {
    console,
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => (n === 'Projects' ? sheet : null) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'PROJECTS_COLUMN_MAP' ? overrideMap ?? null : null) }) },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

const T_PROGRESS = new Date(Date.UTC(2026, 8, 18, 11, 23)); // 18/09/2026 14:23 IDT
const T_CHECK = new Date(Date.UTC(2026, 8, 18, 12, 0));

const liveShapedRows = [
  ['P-001', 'Ariel Life OS', 'Active', 'GREEN', 'HIGH', 'One calm operating system', 'M2 daily loop', 'ev', 'Ship weekly review', '', 'No', '', '', T_PROGRESS, T_CHECK, 'weekly', 'https://x/1'],
  ['P-002', 'Household OS', 'Active', 'YELLOW', 'MEDIUM', '', 'Menu format', '', 'Decide menu format', 'No export', 'Yes', 'Choose the menu format', '', '17/09/2026 09:10', T_CHECK, 'daily', ''],
  ['P-003', 'Personal News Radar', 'Active', 'GREEN', 'HIGH', '', '', '', '', '', '', '', '', '', T_CHECK, '', ''],
  ['P-004', 'Tom AI Learning', 'USER TEST REQUIRED', 'GREEN', 'MEDIUM', '', '', '', 'Test on phone', '', 'No', '', '', '2026-09-16T05:00:00Z', T_CHECK, 'weekly', ''],
  ['P-005', 'Nutrition App', 'Active', 'RED', 'LOW', '', '', '', 'Fix export', 'Export broken', 'Yes', 'Pick data model', 'drift', 'not a date', T_CHECK, '2x/week', ''],
  ['P-006', 'Chief of Staff', 'Active', 'GREEN', 'HIGH', '', 'MVP shell', '', 'Review MVP', '', 'No', '', '', T_PROGRESS, T_CHECK, 'weekly', ''],
];

test('resolves both timestamp columns and cadence from live-shaped headers without override', () => {
  const ctx = makeContext(liveShapedRows);
  const map = ctx.resolveProjectColumns_();
  assert.equal(HEADERS[map.last_meaningful_progress], 'Last Meaningful Progress');
  assert.equal(HEADERS[map.last_control_check], 'Last Control Check');
  assert.equal(HEADERS[map.expected_cadence], 'Expected Cadence');
  assert.equal(HEADERS[map.confidence], 'Confidence');
  assert.equal(HEADERS[map.progress_evidence], 'Progress Evidence');
  assert.equal(HEADERS[map.name], 'Project');
});

test('maps the six canonical rows with distinct progress vs control-check timestamps', () => {
  const ctx = makeContext(liveShapedRows);
  const projects = ctx.readPortfolio_();
  assert.equal(projects.length, 6);
  const names = projects.map((p) => p.name).sort();
  assert.equal(JSON.stringify(names), JSON.stringify(['Ariel Life OS', 'Chief of Staff', 'Household OS', 'Nutrition App', 'Personal News Radar', 'Tom AI Learning']));
  const life = projects.find((p) => p.id === 'P-001');
  assert.equal(life.last_meaningful_progress, T_PROGRESS.toISOString());
  assert.equal(life.last_control_check, T_CHECK.toISOString());
  assert.equal(life.last_check, T_CHECK.toISOString(), 'v1 last_check keeps meaning Last Control Check');
  assert.notEqual(life.last_meaningful_progress, life.last_control_check);
  assert.equal(life.expected_cadence, 'weekly');
  assert.equal(life.role, 'project');
  assert.equal(life.needs_ariel, false);
});

test('parses text timestamps (DD/MM/YYYY HH:MM and ISO) and keeps raw for unparseable text', () => {
  const ctx = makeContext(liveShapedRows);
  const byId = Object.fromEntries(ctx.readPortfolio_().map((p) => [p.id, p]));
  assert.match(byId['P-002'].last_meaningful_progress, /^2026-09-17T/);
  assert.equal(byId['P-002'].last_meaningful_progress_raw, '17/09/2026 09:10');
  assert.equal(byId['P-004'].last_meaningful_progress, '2026-09-16T05:00:00.000Z');
  assert.equal(byId['P-005'].last_meaningful_progress, '');
  assert.equal(byId['P-005'].last_meaningful_progress_raw, 'not a date');
  assert.equal(byId['P-003'].last_meaningful_progress, '');
  assert.equal(byId['P-003'].expected_cadence, '');
});

test('flags needs_ariel / user test and normalises RAG', () => {
  const ctx = makeContext(liveShapedRows);
  const byId = Object.fromEntries(ctx.readPortfolio_().map((p) => [p.id, p]));
  assert.equal(byId['P-002'].needs_ariel, true);
  assert.equal(byId['P-004'].user_test_required, true);
  assert.equal(byId['P-005'].rag, 'RED');
  assert.equal(byId['P-002'].rag, 'YELLOW');
});

test('classifies a Control Tower row as infrastructure, never as a child project', () => {
  const rows = [...liveShapedRows, ['X-1', 'AI Control Tower', 'Active', 'GREEN', 'HIGH', '', '', '', '', '', 'No', '', '', T_PROGRESS, T_CHECK, '', '']];
  const ctx = makeContext(rows);
  const projects = ctx.readPortfolio_();
  assert.equal(projects.filter((p) => p.role === 'project').length, 6);
  assert.equal(projects.find((p) => p.name === 'AI Control Tower').role, 'infrastructure');
});

test('PROJECTS_COLUMN_MAP override wins over aliases', () => {
  const ctx = makeContext(liveShapedRows, JSON.stringify({ last_meaningful_progress: 'Last Control Check' }));
  const map = ctx.resolveProjectColumns_();
  assert.equal(HEADERS[map.last_meaningful_progress], 'Last Control Check');
});

test('health exposes the contract version and unresolved columns', () => {
  const ctx = makeContext(liveShapedRows);
  ctx.SpreadsheetApp.openById = () => ({
    getName: () => 'PROJECT_CONTROL_BOARD',
    getSheets: () => [{ getName: () => 'Projects' }],
    getSheetByName: (n) => (n === 'Projects' ? { getLastRow: () => 7, getLastColumn: () => HEADERS.length, getRange: (r, c, nr, nc) => ({ getValues: () => [HEADERS.slice(c - 1, c - 1 + nc)] }) } : null),
  });
  ctx.countActiveDevices_ = () => 0;
  ctx.isFcmConfigured_ = () => false;
  ctx.isScannerTriggerInstalled_ = () => false;
  ctx.activityHealth_ = () => ({ sources_enabled: 0, ledger_events: 0, latest_observed_activity: '' });
  const h = ctx.healthReport_();
  assert.equal(h.contract_version, 3);
  assert.equal(JSON.stringify(h.unresolved_columns), '[]');
  assert.equal(h.resolved_columns.last_meaningful_progress, 'Last Meaningful Progress');
});

test('CombinedCode.gs is generated from the current modular sources', async () => {
  const { combined } = await import('../build-combined.mjs');
  const current = readFileSync(join(here, '..', 'CombinedCode.gs'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(current, combined().replace(/\r\n/g, '\n'));
});

// ---------- 0.7: timestamp shapes (accepted / rejected) ----------

test('parseCellDate_ accepts every documented shape and rejects prose', () => {
  const ctx = makeContext(liveShapedRows);
  const p = (v) => ctx.parseCellDate_(v);
  // exact instants
  assert.equal(p('2026-09-18T11:23:00Z').iso, '2026-09-18T11:23:00.000Z');
  assert.equal(p('2026-09-18T14:23:00+03:00').iso, '2026-09-18T11:23:00.000Z');
  assert.equal(p('2026-09-18T14:23:00.250+0300').iso, '2026-09-18T11:23:00.250Z');
  // Israel wall clock (IDT in September = UTC+3, IST in January = UTC+2)
  assert.equal(p('2026-09-18 14:23').iso, '2026-09-18T11:23:00.000Z');
  assert.equal(p('2026-09-18T14:23').iso, '2026-09-18T11:23:00.000Z');
  assert.equal(p('2026-09-18').iso, '2026-09-17T21:00:00.000Z');
  assert.equal(p('2026-01-15 09:00').iso, '2026-01-15T07:00:00.000Z');
  assert.equal(p('18/09/2026 14:23').iso, '2026-09-18T11:23:00.000Z');
  assert.equal(p('18.9.2026').iso, '2026-09-17T21:00:00.000Z');
  assert.equal(p('18-09-2026 08:07').iso, '2026-09-18T05:07:00.000Z');
  // status word + timestamp, then anything
  const v = p('VERIFIED 2026-09-17 08:07: nightly sync ran, 6 rows');
  assert.equal(v.iso, '2026-09-17T05:07:00.000Z');
  assert.equal(v.raw, 'VERIFIED 2026-09-17 08:07: nightly sync ran, 6 rows');
  assert.equal(p('reported: 17/09/2026 09:10 — APK sent').iso, '2026-09-17T06:10:00.000Z');
  assert.equal(p('מאומת 2026-09-17 08:07 סנכרון').iso, '2026-09-17T05:07:00.000Z');
  // rejected: prose, mid-sentence dates, relative words, garbage
  assert.equal(p('nightly sync ran on 2026-09-17 08:07').iso, '');
  assert.equal(p('yesterday').iso, '');
  assert.equal(p('ongoing').iso, '');
  assert.equal(p('VERIFIED yesterday morning').iso, '');
  assert.equal(p('20260918').iso, '');
  assert.equal(p('18/09/26').iso, '');
  assert.equal(p('').iso, '');
  assert.equal(p('ongoing').raw, 'ongoing');
});

test('Connections resolves the real board headers (Platform / Verification Status / Evidence / Connector)', () => {
  const ctx = makeContext(liveShapedRows);
  const CONN_HEADERS = ['Platform', 'Verification Status', 'Evidence / Connector', 'Notes'];
  const CONN_ROWS = [['Google Drive', 'VERIFIED', 'Apps Script gateway', ''], ['Firebase', 'PENDING', 'FCM service account not set', 'x'], ['', '', '', '']];
  ctx.SpreadsheetApp.openById = () => ({
    getSheetByName: (n) => n === 'Connections' ? {
      getLastRow: () => CONN_ROWS.length + 1, getLastColumn: () => CONN_HEADERS.length,
      getRange: () => ({ getValues: () => [CONN_HEADERS, ...CONN_ROWS] }),
    } : null,
  });
  const out = ctx.readConnections_();
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'Google Drive');
  assert.equal(out[0].status, 'VERIFIED');
  assert.equal(out[0].note, 'Apps Script gateway');
  assert.equal(out[1].status, 'PENDING');
});

test('every reply carries contract/gateway version so a deployment can be verified without the token', () => {
  const ctx = makeContext(liveShapedRows);
  let captured = '';
  ctx.ContentService = { createTextOutput: (t) => { captured = t; return { setMimeType: () => ({}) }; }, MimeType: { JSON: 'json' } };
  ctx.reply_(401, { ok: false, error: 'unauthorized' });
  const body = JSON.parse(captured);
  assert.equal(body.contract_version, 3);
  assert.equal(body.gateway_version, '0.8.0');
  assert.equal(body.error, 'unauthorized');
});

test('board column names from the hardening brief resolve without collisions', () => {
  const HEAD = ['ID', 'Project', 'Lifecycle', 'RAG', 'Confidence', 'Objective', 'Current Milestone', 'Progress Evidence',
    'Next Action', 'Blocker / Dependency', 'Needs Ariel', 'Ariel Decision / Input', 'Risk / Drift',
    'Last Meaningful Progress', 'Last Control Check', 'Expected Cadence', 'Primary Link'];
  const ctx = makeContext([]);
  ctx.SpreadsheetApp.openById = () => ({ getSheetByName: (n) => n === 'Projects' ? { getLastColumn: () => HEAD.length, getLastRow: () => 1, getRange: (r, c, nr, nc) => ({ getValues: () => [HEAD.slice(c - 1, c - 1 + nc)] }) } : null });
  const map = ctx.resolveProjectColumns_();
  const expect = { id: 'ID', name: 'Project', lifecycle: 'Lifecycle', rag: 'RAG', confidence: 'Confidence', objective: 'Objective',
    milestone: 'Current Milestone', progress_evidence: 'Progress Evidence', next_action: 'Next Action', blocker: 'Blocker / Dependency',
    needs_ariel: 'Needs Ariel', ariel_input: 'Ariel Decision / Input', risk: 'Risk / Drift', last_meaningful_progress: 'Last Meaningful Progress',
    last_control_check: 'Last Control Check', expected_cadence: 'Expected Cadence', link: 'Primary Link' };
  for (const [field, header] of Object.entries(expect)) assert.equal(HEAD[map[field]], header, field);
  const used = Object.values(map).filter((i) => i >= 0);
  assert.equal(new Set(used).size, used.length, 'no two fields share a column');
});
