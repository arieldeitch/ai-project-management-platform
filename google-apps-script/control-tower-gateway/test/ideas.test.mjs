import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = ['Config.gs', 'Portfolio.gs', 'Ideas.gs', 'Code.gs'].map((f) => readFileSync(join(here, '..', f), 'utf8')).join('\n');

function context() {
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => 18,
    getFrozenRows: () => 1,
    setFrozenRows: () => {},
    appendRow: (r) => rows.push(r),
    getRange: (r, c, nr, nc) => ({
      getValues: () => r === 1 ? [[...Array(nc)].map((_, i) => ctx.IDEA_HEADERS[i] || '')] : rows.slice(r - 2, r - 2 + nr).map((x) => x.slice(c - 1, c - 1 + nc)),
      setValue: (v) => { rows[r - 2][c - 1] = v; return { setFontWeight: () => {} }; },
      setValues: () => ({ setFontWeight: () => {} }), setFontWeight: () => {},
    }),
  };
  const ctx = {
    console,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, getSheets: () => [{ getName: () => 'Ideas' }], getName: () => 'board' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    Utilities: { getUuid: () => '12345678-aaaa-bbbb-cccc-123456789012' },
  };
  vm.createContext(ctx); vm.runInContext(src, ctx); ctx.rows = rows; return ctx;
}

test('creates a quick idea safely with defaults and lists it from the canonical sheet', () => {
  const ctx = context();
  const created = ctx.createIdea_({ title: '  רעיון טוב  ' });
  assert.equal(created.item.idea_id, 'IDEA-12345678');
  assert.equal(created.item.stage, 'INBOX');
  assert.equal(created.item.urgency, 'MEDIUM');
  const items = ctx.listIdeas_(20);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'רעיון טוב');
});

test('calculates maturity and rejects unrecognised checklist enum values', () => {
  const ctx = context();
  const made = ctx.createIdea_({ title: 'x', need: 'pain', desired_outcome: 'gain', core_functionality: 'do it', surface: 'spaceship', urgency: 'HIGH', next_step: 'talk' });
  assert.equal(made.item.surface, 'UNDECIDED');
  assert.ok(ctx.ideaMaturity_(made.item) >= 50);
});

test('updates only the requested idea and allows deliberate stage progression', () => {
  const ctx = context();
  const made = ctx.createIdea_({ title: 'x' });
  ctx.updateIdea_({ idea_id: made.item.idea_id, stage: 'CLARIFY', success_metric: '3 users' });
  const item = ctx.listIdeas_(20)[0];
  assert.equal(item.stage, 'CLARIFY');
  assert.equal(item.success_metric, '3 users');
});
