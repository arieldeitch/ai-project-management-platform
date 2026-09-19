#!/usr/bin/env node
// Emit a Real-Time Project Activity Heartbeat to the Control Tower gateway (ActivityLedger).
//
//   node scripts/control-tower/heartbeat.mjs --project P-006 --summary "M2 live read verified" \
//        [--type progress|checkpoint|report] [--evidence https://github.com/.../pull/12] \
//        [--level REPORTED|OBSERVED|VERIFIED] [--at 2026-09-19T05:07:00Z] [--id cos-run-42] [--strict]
//
// Credentials: the gateway token is read ONLY from the CT_GATEWAY_TOKEN environment variable or from the
// file ~/.config/control-tower/token (0600). It is never printed, logged or accepted on the command line.
// Failure to send NEVER blocks project work: the script exits 0 with a warning unless --strict is given.
// Without a token it exits 0 and tells you to fall back to commit/push + run report / canonical Drive workboard.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycby-YyosI2EYgvsaylDI1f82yFdTR7XuDHwRKshM-K9ODWadXWx3193GfiQKjItnrvqO/exec';

function arg(name, fallback = '') {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}
const strict = process.argv.includes('--strict');
const done = (msg, code = 0) => { console.error(msg); process.exit(strict ? code : 0); };

const project = arg('project');
const summary = arg('summary');
if (!project || !summary) done('heartbeat: --project and --summary are required (skipping, not blocking)', 2);

let token = (process.env.CT_GATEWAY_TOKEN || '').trim();
if (!token) {
  try { token = readFileSync(join(homedir(), '.config', 'control-tower', 'token'), 'utf8').trim(); } catch {}
}
if (token.length < 32) done('heartbeat: no gateway token available — fall back to commit/push + run report or the canonical Drive workboard', 3);

const body = {
  token,
  action: 'activity_heartbeat',
  project_id: project,
  occurred_at: arg('at', new Date().toISOString()),
  activity_type: arg('type', 'progress'),
  summary: summary.slice(0, 800),
  evidence_url: arg('evidence'),
  evidence_level: arg('level', 'REPORTED'),
  client_event_id: arg('id'),
  source_type: arg('source', 'agent_heartbeat'),
  metadata: { emitter: 'scripts/control-tower/heartbeat.mjs', host: process.env.COMPUTERNAME || process.env.HOSTNAME || '' },
};

try {
  const res = await fetch(process.env.CT_GATEWAY_URL || DEFAULT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { done('heartbeat: gateway returned non-JSON (deployment/URL problem)', 4); }
  if (!json.ok) done(`heartbeat: gateway rejected the event (${json.error || json.status})`, 5);
  console.log(`heartbeat recorded=${json.recorded} duplicate=${!!json.duplicate} event_id=${json.event_id} occurred_at=${json.occurred_at}`);
} catch (e) {
  done(`heartbeat: network failure (${e.name}) — project work is not blocked`, 6);
}
