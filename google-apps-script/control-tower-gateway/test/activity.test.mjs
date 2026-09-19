// Deterministic tests for the live activity pipeline (no live GitHub/Drive; Apps Script globals are stubbed).
// Run: node --test google-apps-script/control-tower-gateway/test/activity.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = ['Config.gs', 'Portfolio.gs', 'Activity.gs', 'Code.gs'].map((f) => readFileSync(join(here, '..', f), 'utf8')).join('\n');

/** In-memory sheet good enough for getRange/getValues/setValues/setValue/getLastRow. */
function memSheet(headers, rows) {
  const data = [headers.slice(), ...rows.map((r) => r.slice())];
  return {
    _data: data,
    getLastRow: () => data.length,
    getLastColumn: () => headers.length,
    getFrozenRows: () => 1,
    setFrozenRows: () => {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) out.push((data[r - 1 + i] || []).slice(c - 1, c - 1 + nc)); return out; },
      setValues: (vals) => { vals.forEach((row, i) => { while (data.length < r + i) data.push([]); for (let j = 0; j < nc; j++) data[r - 1 + i][c - 1 + j] = row[j]; }); return this; },
      setValue: (v) => { while (data.length < r) data.push([]); data[r - 1][c - 1] = v; return { setFontWeight: () => {} }; },
      setFontWeight: () => {},
    }),
  };
}

const SOURCE_HEADERS = ['project_id', 'project_name', 'source_type', 'locator', 'branch', 'include_automation', 'enabled', 'last_poll_at', 'last_seen_at', 'notes'];
const LEDGER_HEADERS = ['event_id', 'occurred_at', 'observed_at', 'project_id', 'project_name', 'source_type', 'source_locator', 'activity_type', 'summary', 'evidence_url', 'evidence_level', 'metadata_json'];

function ledgerRow(id, at, pid, source, type, summary = 's', url = 'https://e/x', level = 'OBSERVED') {
  return [id, at, at, pid, pid, source, 'loc', type, summary, url, level, ''];
}

function context({ sources = [], ledger = [], projects = [], properties = {}, fetch = null } = {}) {
  const sheets = {
    ActivitySources: memSheet(SOURCE_HEADERS, sources),
    ActivityLedger: memSheet(LEDGER_HEADERS, ledger),
  };
  const props = { ...properties };
  const ctx = {
    console: { log() {}, error() {} },
    Date,
    SpreadsheetApp: { openById: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = memSheet([], [])), getSheets: () => Object.keys(sheets).map((n) => ({ getName: () => n })), getName: () => 'BOARD' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (a, s) => Array.from(Buffer.from(String(s))).slice(0, 24), base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url') },
    UrlFetchApp: { fetch: fetch || (() => { throw new Error('network disabled in tests'); }) },
    DriveApp: { getFileById: () => { throw new Error('drive disabled'); } },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  ctx.readPortfolio_ = () => projects.map((p) => ({ ...p }));
  ctx._sheets = sheets;
  ctx._props = props;
  return ctx;
}

const P = (id, curated, extra = {}) => ({ id, name: id, last_meaningful_progress: curated, last_meaningful_progress_raw: '', last_control_check: '2026-09-19T09:00:00.000Z', last_check: '2026-09-19T09:00:00.000Z', progress_evidence: 'board note', link: 'https://board/' + id, ...extra });

// ---------- selection precedence ----------

test('ledger GitHub evidence newer than the curated cell becomes the effective last_meaningful_progress (0.7 clients benefit)', () => {
  const ctx = context({ ledger: [ledgerRow('github_pr:arieldeitch/child-s-day:45:2026-09-19T04:27:36.000Z', '2026-09-19T04:27:36.000Z', 'P-002', 'github_pr', 'progress', 'PR #45 · merged: Weekly menu')] });
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-002', '2026-09-16T09:25:00.000Z')]);
  assert.equal(p.last_meaningful_progress, '2026-09-19T04:27:36.000Z');
  assert.equal(p.curated_last_meaningful_progress, '2026-09-16T09:25:00.000Z');
  assert.equal(p.activity_origin, 'github');
  assert.equal(p.selected_activity_source, 'github_pr');
  assert.equal(p.last_meaningful_progress_raw, '');
  assert.equal(p.latest_meaningful_activity_at, '2026-09-19T04:27:36.000Z');
});

test('precedence: explicit heartbeat outranks inferred GitHub activity in the same work window, but not materially newer work', () => {
  const rows = [
    ledgerRow('heartbeat:abc', '2026-09-19T05:00:00.000Z', 'P-001', 'agent_heartbeat', 'progress', 'run report'),
    ledgerRow('github_commit:r:1', '2026-09-19T05:10:00.000Z', 'P-001', 'github_commit', 'progress', 'commit within 10 min'),
  ];
  let ctx = context({ ledger: rows });
  let [p] = ctx.enrichPortfolioWithActivity_([P('P-001', '2026-09-10T00:00:00.000Z')]);
  assert.equal(p.activity_origin, 'heartbeat');
  assert.equal(p.last_meaningful_progress, '2026-09-19T05:00:00.000Z');
  // GitHub two hours later is genuinely newer work → it wins
  ctx = context({ ledger: [...rows, ledgerRow('github_commit:r:2', '2026-09-19T07:00:00.000Z', 'P-001', 'github_commit', 'progress', 'later commit')] });
  [p] = ctx.enrichPortfolioWithActivity_([P('P-001', '2026-09-10T00:00:00.000Z')]);
  assert.equal(p.activity_origin, 'github');
  assert.equal(p.last_meaningful_progress, '2026-09-19T07:00:00.000Z');
});

test('equal timestamps resolve by evidence quality: heartbeat > run_report > github > drive', () => {
  const at = '2026-09-19T06:00:00.000Z';
  const ctx = context({ ledger: [
    ledgerRow('d', at, 'P-004', 'drive_file', 'report'),
    ledgerRow('g', at, 'P-004', 'github_commit', 'progress'),
    ledgerRow('r', at, 'P-004', 'run_report', 'report'),
    ledgerRow('h', at, 'P-004', 'agent_heartbeat', 'progress'),
  ] });
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-004', '')]);
  assert.equal(p.activity_origin, 'heartbeat');
});

// ---------- automation rules ----------

test('automation counts as project activity only when ActivitySources.include_automation is true', () => {
  const ledger = [ledgerRow('github_commit:news:1', '2026-09-19T06:30:00.000Z', 'P-003', 'github_commit', 'automation', 'feed refresh')];
  let ctx = context({ ledger, sources: [['P-003', 'News', 'github_repo', 'arieldeitch/personal-news-radar', 'main', 'TRUE', 'TRUE', '', '', '']] });
  let [p] = ctx.enrichPortfolioWithActivity_([P('P-003', '2026-09-18T10:00:00.000Z')]);
  assert.equal(p.activity_origin, 'automation');
  assert.equal(p.last_meaningful_progress, '2026-09-19T06:30:00.000Z');
  assert.equal(p.latest_activity_type, 'automation');
  // same event, project without include_automation → curated wins, automation stays visible only as latest_activity
  ctx = context({ ledger: ledger.map((r) => { const c = r.slice(); c[3] = 'P-005'; c[4] = 'P-005'; return c; }), sources: [['P-005', 'Nutrition', 'github_repo', 'arieldeitch/my-elenas-plate', 'main', 'FALSE', 'TRUE', '', '', '']] });
  [p] = ctx.enrichPortfolioWithActivity_([P('P-005', '2026-09-18T10:00:00.000Z')]);
  assert.equal(p.activity_origin, 'curated_board');
  assert.equal(p.last_meaningful_progress, '2026-09-18T10:00:00.000Z');
  assert.equal(p.latest_activity_type, 'automation');
});

test('control_check events never count as project activity and never become the fallback', () => {
  const ctx = context({ ledger: [ledgerRow('cc', '2026-09-19T08:00:00.000Z', 'P-006', 'control_tower', 'control_check', 'CT verified board')] });
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-006', '')]);
  assert.equal(p.activity_origin, 'none');
  assert.equal(p.last_meaningful_progress, '');
  assert.equal(p.latest_activity_at, '');
  assert.notEqual(p.last_meaningful_progress, p.last_control_check);
});

test('no qualifying ledger event → curated Last Meaningful Progress with its raw evidence text; Last Control Check untouched', () => {
  const ctx = context({ ledger: [] });
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-002', '2026-09-16T09:25:00.000Z', { last_meaningful_progress_raw: 'VERIFIED 2026-09-16 12:25: menu draft' })]);
  assert.equal(p.activity_origin, 'curated_board');
  assert.equal(p.last_meaningful_progress, '2026-09-16T09:25:00.000Z');
  assert.equal(p.last_meaningful_progress_raw, 'VERIFIED 2026-09-16 12:25: menu draft');
  assert.equal(p.selected_activity_source, 'project_board');
  assert.equal(p.last_control_check, '2026-09-19T09:00:00.000Z');
  assert.notEqual(p.last_meaningful_progress, p.last_control_check);
});

test('curated status fields are never mutated by activity enrichment', () => {
  const ctx = context({ ledger: [ledgerRow('g', '2026-09-19T04:00:00.000Z', 'P-002', 'github_commit', 'progress')] });
  const input = P('P-002', '2026-09-16T09:25:00.000Z', { rag: 'YELLOW', milestone: 'M', next_action: 'N', lifecycle: 'Active', needs_ariel: true });
  const [p] = ctx.enrichPortfolioWithActivity_([input]);
  assert.equal(p.rag, 'YELLOW'); assert.equal(p.milestone, 'M'); assert.equal(p.next_action, 'N'); assert.equal(p.lifecycle, 'Active'); assert.equal(p.needs_ariel, true);
});

// ---------- mapping ----------

test('GitHub PushEvent maps to a stable github_commit id with real time, evidence URL and automation flag', () => {
  const ctx = context();
  const source = { project_id: 'P-001', project_name: 'Ariel Life OS', locator: 'arieldeitch/ariel-habit-ai', branch: 'main', include_automation: false };
  const ev = ctx.githubRepoEvent_(source, { id: '1', type: 'PushEvent', created_at: '2026-09-19T04:20:00Z', actor: { login: 'arieldeitch' }, payload: { ref: 'refs/heads/main', head: 'abc123', commits: [{ sha: 'abc123', message: 'feat: weekly review loop\n\nbody' }] } });
  assert.equal(ev.event_id, 'github_commit:arieldeitch/ariel-habit-ai:abc123');
  assert.equal(ev.occurred_at, '2026-09-19T04:20:00.000Z');
  assert.equal(ev.activity_type, 'progress');
  assert.equal(ev.evidence_url, 'https://github.com/arieldeitch/ariel-habit-ai/commit/abc123');
  const bot = ctx.githubRepoEvent_(source, { id: '2', type: 'PushEvent', created_at: '2026-09-19T04:25:00Z', actor: { login: 'github-actions[bot]' }, payload: { ref: 'refs/heads/main', head: 'def', commits: [{ sha: 'def', message: 'chore(feed): refresh' }] } });
  assert.equal(bot.activity_type, 'automation');
  assert.equal(ctx.githubRepoEvent_(source, { id: '3', type: 'WatchEvent', created_at: '2026-09-19T04:25:00Z', payload: {} }), null);
});

test('GitHub PR merge maps to github_pr:<repo>:<number>:<merged_at> with a merged summary', () => {
  const ctx = context();
  const source = { project_id: 'P-002', project_name: 'Household OS', locator: 'arieldeitch/child-s-day', branch: 'main', include_automation: false };
  const ev = ctx.githubRepoEvent_(source, { id: '9', type: 'PullRequestEvent', created_at: '2026-09-19T04:27:40Z', actor: { login: 'arieldeitch' }, payload: { action: 'closed', number: 45, pull_request: { number: 45, title: 'Weekly menu format', merged: true, merged_at: '2026-09-19T04:27:36Z', html_url: 'https://github.com/arieldeitch/child-s-day/pull/45' } } });
  assert.equal(ev.event_id, 'github_pr:arieldeitch/child-s-day:45:2026-09-19T04:27:36.000Z');
  assert.equal(ev.occurred_at, '2026-09-19T04:27:36.000Z');
  assert.match(ev.summary, /^PR #45 · merged: Weekly menu format/);
  assert.equal(ev.evidence_url, 'https://github.com/arieldeitch/child-s-day/pull/45');
  const opened = ctx.githubRepoEvent_(source, { id: '10', type: 'PullRequestEvent', created_at: '2026-09-18T10:00:00Z', payload: { action: 'opened', number: 46, pull_request: { number: 46, title: 'x' } } });
  assert.equal(opened.event_id, 'github_pr:arieldeitch/child-s-day:46:2026-09-18T10:00:00.000Z');
});

test('Drive modifiedTime maps to drive_file:<fileId>:<modifiedTime> and only appends when it advances', () => {
  const ctx = context();
  const stamp = new Date('2026-09-19T03:00:00Z');
  ctx.DriveApp = { getFileById: () => ({ getLastUpdated: () => stamp, getName: () => 'ACTIVE_WORKBOARD', getUrl: () => 'https://docs.google.com/x' }) };
  const seen = {};
  const source = { project_id: 'P-004', project_name: 'Tom AI Learning', locator: 'FILEID', branch: 'main' };
  const first = ctx.pollDriveFileSource_(source, seen);
  assert.equal(first.inserted, 1);
  assert.equal(ctx._sheets.ActivityLedger._data[1][0], 'drive_file:FILEID:2026-09-19T03:00:00.000Z');
  assert.equal(ctx._sheets.ActivityLedger._data[1][7], 'report');
  const second = ctx.pollDriveFileSource_(source, seen);
  assert.equal(second.inserted, 0, 'same modifiedTime is not appended twice');
});

// ---------- dedupe, polling, failure isolation ----------

test('event ids are deduped against the ledger and across a poll', () => {
  const ctx = context({ ledger: [ledgerRow('github_commit:r:old', '2026-09-18T00:00:00.000Z', 'P-001', 'github_commit', 'progress')] });
  const seen = ctx.activityIdSet_();
  const n = ctx.appendActivityEvents_([
    { event_id: 'github_commit:r:old', occurred_at: '2026-09-18T00:00:00.000Z', project_id: 'P-001' },
    { event_id: 'github_commit:r:new', occurred_at: '2026-09-19T00:00:00.000Z', project_id: 'P-001' },
    { event_id: 'github_commit:r:new', occurred_at: '2026-09-19T00:00:00.000Z', project_id: 'P-001' },
  ], seen);
  assert.equal(n, 1);
  assert.equal(ctx._sheets.ActivityLedger.getLastRow(), 3);
});

test('poll: one failing source does not stop the others, rate limits are recorded, ETag 304 costs nothing, scan state is saved', () => {
  const events = [{ id: '1', type: 'PushEvent', created_at: '2026-09-19T04:20:00Z', actor: { login: 'arieldeitch' }, payload: { ref: 'refs/heads/main', head: 'aaa', commits: [{ sha: 'aaa', message: 'feat: x' }] } }];
  const calls = [];
  const fetch = (url, opts) => {
    calls.push({ url, etag: opts.headers['If-None-Match'] || '' });
    const mk = (code, body, headers = {}) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(body), getHeaders: () => headers });
    if (url.includes('ariel-habit-ai')) return opts.headers['If-None-Match'] === 'W/"e1"' ? mk(304, null) : mk(200, events, { ETag: 'W/"e1"' });
    if (url.includes('child-s-day')) return mk(403, { message: 'rate limit' }, { 'x-ratelimit-remaining': '0' });
    return mk(500, {});
  };
  const ctx = context({
    fetch,
    sources: [
      ['P-001', 'Ariel Life OS', 'github_repo', 'arieldeitch/ariel-habit-ai', 'main', 'FALSE', 'TRUE', '', '', ''],
      ['P-002', 'Household OS', 'github_repo', 'arieldeitch/child-s-day', 'main', 'FALSE', 'TRUE', '', '', ''],
      ['P-004', 'Tom AI Learning', 'drive_file', 'FILEID', '', 'FALSE', 'TRUE', '', '', ''],
      ['P-009', 'Disabled', 'github_repo', 'x/y', 'main', 'FALSE', 'FALSE', '', '', ''],
    ],
  });
  const r1 = ctx.pollActivitySources_();
  assert.equal(r1.checked, 3);
  assert.equal(r1.inserted, 1);
  assert.equal(r1.errors.map((e) => e.split(':').slice(0, 2).join(':')).join(','), 'P-002:events,P-004:drive disabled');
  assert.ok(r1.errors[0].includes('rate_limited'));
  const state = JSON.parse(ctx._props.ACTIVITY_SCAN_STATE);
  assert.equal(state.status, 'partial');
  assert.equal(state.inserted, 1);
  assert.equal(ctx._props['GH_ETAG:arieldeitch/ariel-habit-ai'], 'W/"e1"');
  const r2 = ctx.pollActivitySources_();
  assert.equal(r2.inserted, 0);
  assert.equal(calls.filter((c) => c.url.includes('ariel-habit-ai'))[1].etag, 'W/"e1"');
  // portfolio still reads fine with the partial ledger
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-001', '2026-09-10T00:00:00.000Z')]);
  assert.equal(p.last_meaningful_progress, '2026-09-19T04:20:00.000Z');
  const health = ctx.activityHealth_();
  assert.equal(health.activity_scan_status, 'partial');
  assert.equal(health.activity_sources_enabled, 3);
  assert.equal(health.activity_ledger_latest_at, '2026-09-19T04:20:00.000Z');
  assert.equal(health.activity_source_failures.length, 2);
});

test('portfolio enrichment degrades to curated values when activity sheets are unreadable', () => {
  const ctx = context();
  ctx.SpreadsheetApp = { openById: () => { throw new Error('sheet gone'); } };
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-001', '2026-09-10T00:00:00.000Z')]);
  assert.equal(p.last_meaningful_progress, '2026-09-10T00:00:00.000Z');
  assert.equal(p.activity_origin, 'curated_board');
});

// ---------- direct heartbeat ----------

test('activity_heartbeat validates, records, and dedupes by client_event_id or content digest', () => {
  const ctx = context({ projects: [P('P-006', '')], sources: [['P-001', 'Ariel Life OS', 'github_repo', 'arieldeitch/ariel-habit-ai', 'main', 'FALSE', 'TRUE', '', '', '']] });
  const ok = ctx.recordActivityHeartbeat_({ project_id: 'P-006', occurred_at: '2026-09-19 08:07', activity_type: 'progress', summary: 'M2 live read verified', evidence_url: 'https://github.com/arieldeitch/chief-of-staff/pull/12', evidence_level: 'verified', client_event_id: 'cos-run-42' });
  assert.equal(ok.recorded, true);
  assert.equal(ok.event_id, 'heartbeat:cos-run-42');
  assert.equal(ok.occurred_at, '2026-09-19T05:07:00.000Z');
  assert.equal(ctx._sheets.ActivityLedger._data[1][10], 'VERIFIED');
  const dup = ctx.recordActivityHeartbeat_({ project_id: 'P-006', occurred_at: '2026-09-19 08:07', activity_type: 'progress', summary: 'M2 live read verified', client_event_id: 'cos-run-42' });
  assert.equal(dup.recorded, false); assert.equal(dup.duplicate, true);
  const digest1 = ctx.recordActivityHeartbeat_({ project_id: 'P-001', occurred_at: '2026-09-19T05:00:00Z', summary: 'no client id' });
  const digest2 = ctx.recordActivityHeartbeat_({ project_id: 'P-001', occurred_at: '2026-09-19T05:00:00Z', summary: 'no client id' });
  assert.equal(digest1.recorded, true); assert.equal(digest2.recorded, false);
  assert.equal(ctx._sheets.ActivityLedger.getLastRow(), 3);
  // validation
  assert.throws(() => ctx.recordActivityHeartbeat_({ project_id: 'P-404', summary: 'x' }), /unknown project_id/);
  assert.throws(() => ctx.recordActivityHeartbeat_({ project_id: 'P-006', occurred_at: 'yesterday', summary: 'x' }), /not a supported timestamp/);
  assert.throws(() => ctx.recordActivityHeartbeat_({ project_id: 'P-006', summary: 'x', activity_type: 'deploy' }), /activity_type/);
  assert.throws(() => ctx.recordActivityHeartbeat_({ project_id: 'P-006', summary: 'x', evidence_url: 'javascript:alert(1)' }), /http/);
  assert.throws(() => ctx.recordActivityHeartbeat_({ project_id: 'P-006', summary: '' }), /summary/);
  assert.throws(() => ctx.recordActivityHeartbeat_({ project_id: 'P-006', summary: 'x', occurred_at: '2099-01-01T00:00:00Z' }), /future/);
  // a heartbeat recorded now becomes the effective activity immediately
  const [p] = ctx.enrichPortfolioWithActivity_([P('P-006', '2026-09-18T00:00:00.000Z')]);
  assert.equal(p.activity_origin, 'heartbeat');
  assert.equal(p.last_meaningful_progress, '2026-09-19T05:07:00.000Z');
});

test('gateway exposes activity_heartbeat and project_activity actions and reports contract 4', () => {
  const ctx = context();
  assert.ok(typeof ctx.ACTIONS.activity_heartbeat === 'function');
  assert.ok(typeof ctx.ACTIONS.project_activity === 'function');
  assert.equal(ctx.GATEWAY_CONTRACT_VERSION, 4);
  assert.equal(ctx.GATEWAY_VERSION, '0.9.0');
});
