// Ideas incubator: header-name column resolution, planning buckets, manual order, reorder batch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = ['Config.gs', 'Portfolio.gs', 'Os.gs', 'Ideas.gs', 'Code.gs'].map((f) => readFileSync(join(here, '..', f), 'utf8')).join('\n');

function memSheet(headers, rows) {
  const data = [headers.slice(), ...rows.map((r) => r.slice())];
  const width = () => Math.max(...data.map((r) => r.length));
  return {
    _data: data,
    getLastRow: () => data.length,
    getLastColumn: () => width(),
    getFrozenRows: () => 1,
    setFrozenRows: () => {},
    appendRow: (r) => data.push(r.slice()),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = data[r - 1 + i] || []; const seg = []; for (let j = 0; j < nc; j++) seg.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(seg); } return out; },
      setValues: (vals) => { vals.forEach((row, i) => { while (data.length < r + i) data.push([]); for (let j = 0; j < row.length; j++) data[r - 1 + i][c - 1 + j] = row[j]; }); return { setFontWeight: () => {} }; },
      setValue: (v) => { while (data.length < r) data.push([]); data[r - 1][c - 1] = v; return { setFontWeight: () => {} }; },
      setFontWeight: () => {},
    }),
  };
}

// Ariel added planning_bucket / manual_order himself — NOT at the end, and with a stray column in between.
const HEADERS = ['idea_id', 'created_at', 'updated_at', 'title', 'planning_bucket', 'stage', 'need', 'target_user', 'desired_outcome', 'core_functionality',
  'usage_frequency', 'urgency', 'surface', 'automation_level', 'data_needed', 'success_metric', 'constraints', 'next_step', 'manual_order', 'owner_note', 'notes'];
const row = (id, title, bucket, order, stage = 'INBOX', updated = '2026-09-19T05:00:00.000Z') => {
  const r = new Array(HEADERS.length).fill('');
  r[0] = id; r[1] = '2026-09-18T00:00:00.000Z'; r[2] = updated; r[3] = title; r[4] = bucket; r[5] = stage; r[18] = order;
  return r;
};

function context(rows = []) {
  const sheet = memSheet(HEADERS, rows);
  let n = 0;
  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (name) => (name === 'Ideas' ? sheet : null), insertSheet: () => sheet, getSheets: () => [{ getName: () => 'Ideas' }], getName: () => 'board' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
    Utilities: { getUuid: () => `0000000${++n}-aaaa-bbbb-cccc-123456789012` },
  };
  vm.createContext(ctx); vm.runInContext(src, ctx); ctx._sheet = sheet; return ctx;
}

test('columns are resolved by header name, so Ariel-added planning_bucket / manual_order are found anywhere', () => {
  const ctx = context([row('IDEA-A', 'A', 'NOW', 20), row('IDEA-B', 'B', 'NOW', 10), row('IDEA-C', 'C', 'LATER', ''), row('IDEA-D', 'D', 'NEXT', 5)]);
  const items = ctx.listIdeas_(50);
  assert.equal(items.map((x) => x.idea_id).join(','), 'IDEA-B,IDEA-A,IDEA-D,IDEA-C');
  assert.equal(items[0].planning_bucket, 'NOW');
  assert.equal(items[0].manual_order, 10);
  assert.equal(items[3].manual_order, null);
  assert.equal(ctx._sheet._data[0].length, HEADERS.length, 'no duplicate headers appended when all exist');
});

test('missing canonical headers are appended once and blank buckets default to LATER', () => {
  const short = HEADERS.filter((h) => h !== 'planning_bucket' && h !== 'manual_order');
  const sheet = memSheet(short, [Object.assign(new Array(short.length).fill(''), { 0: 'IDEA-X', 2: '2026-09-19T00:00:00.000Z', 3: 'X', 4: 'INBOX' })]);
  const ctx = context([]);
  ctx.SpreadsheetApp.openById = () => ({ getSheetByName: () => sheet, getSheets: () => [], getName: () => 'b' });
  const items = ctx.listIdeas_(10);
  assert.equal(items[0].planning_bucket, 'LATER');
  assert.ok(sheet._data[0].includes('planning_bucket') && sheet._data[0].includes('manual_order'));
  ctx.listIdeas_(10);
  assert.equal(sheet._data[0].filter((h) => h === 'manual_order').length, 1);
});

test('create appends into the right columns and lands at the end of its bucket', () => {
  const ctx = context([row('IDEA-A', 'A', 'NOW', 20)]);
  const created = ctx.createIdea_({ title: '  רעיון חדש  ', planning_bucket: 'now' });
  assert.equal(created.item.idea_id, 'IDEA-00000001');
  assert.equal(created.item.planning_bucket, 'NOW');
  assert.equal(created.item.manual_order, 30);
  const last = ctx._sheet._data[ctx._sheet._data.length - 1];
  assert.equal(last[HEADERS.indexOf('title')], 'רעיון חדש');
  assert.equal(last[HEADERS.indexOf('planning_bucket')], 'NOW');
  assert.equal(last[HEADERS.indexOf('manual_order')], 30);
  assert.equal(ctx.listIdeas_(10).map((x) => x.idea_id).join(','), 'IDEA-A,IDEA-00000001');
});

test('reorder_ideas persists bucket + manual order per row and reports unknown ids', () => {
  const ctx = context([row('IDEA-A', 'A', 'NOW', 10), row('IDEA-B', 'B', 'NOW', 20), row('IDEA-C', 'C', 'LATER', 10)]);
  const r = ctx.reorderIdeas_({ items: [
    { idea_id: 'IDEA-C', planning_bucket: 'NOW', manual_order: 10 },
    { idea_id: 'IDEA-B', planning_bucket: 'NOW', manual_order: 20 },
    { idea_id: 'IDEA-A', planning_bucket: 'NEXT', manual_order: 10 },
    { idea_id: 'IDEA-ZZ', planning_bucket: 'NOW', manual_order: 30 },
  ] });
  assert.equal(r.applied, 3);
  assert.equal(r.unknown.join(','), 'IDEA-ZZ');
  assert.equal(ctx.listIdeas_(10).map((x) => x.idea_id + ':' + x.planning_bucket).join(','), 'IDEA-C:NOW,IDEA-B:NOW,IDEA-A:NEXT');
  assert.throws(() => ctx.reorderIdeas_({ items: [] }), /items is required/);
});

test('update_idea keeps other fields, validates enums, bumps updated_at', () => {
  const ctx = context([row('IDEA-A', 'A', 'NOW', 10)]);
  const r = ctx.updateIdea_({ idea_id: 'IDEA-A', stage: 'shape', planning_bucket: 'garbage', urgency: 'HIGH', title: 'A2' });
  const item = ctx.listIdeas_(10)[0];
  assert.equal(item.stage, 'SHAPE');
  assert.equal(item.planning_bucket, 'LATER');
  assert.equal(item.urgency, 'HIGH');
  assert.equal(item.title, 'A2');
  assert.equal(item.manual_order, 10);
  assert.ok(r.updated_at);
  assert.throws(() => ctx.updateIdea_({ idea_id: 'NOPE' }), /idea not found/);
});

test('gateway exposes reorder_ideas and os_receipt actions at contract 5', () => {
  const ctx = context();
  assert.equal(typeof ctx.ACTIONS.reorder_ideas, 'function');
  assert.equal(typeof ctx.ACTIONS.os_receipt, 'function');
  assert.equal(ctx.GATEWAY_CONTRACT_VERSION, 5);
  assert.equal(ctx.GATEWAY_VERSION, '0.10.0');
});
