#!/usr/bin/env node
// Record an OS Access Receipt for one project in the Control Tower gateway (PROJECT_CONTROL_BOARD OS columns).
//
//   node scripts/control-tower/os-receipt.mjs --project P-006 --marker OS-2026-09-17 \
//        --evidence https://drive.google.com/…/receipt-or-run-report [--version 1.1] \
//        [--at 2026-09-19T05:07:00Z] [--applied true|false] [--notes "…"] [--strict]
//   node scripts/control-tower/os-receipt.mjs --project P-006 --access-failed --notes "Drive folder not shared"
//
// What counts as evidence: the run/receipt artifact that shows the project actually READ the canonical OS
// (its CURRENT_OS_VERSION / change marker). Commits, GitHub pushes and Control Tower checks are NOT evidence;
// the gateway will not mark a project CURRENT from them, only from a receipt whose marker equals the canonical one.
//
// Credentials: the gateway token is read ONLY from the CT_GATEWAY_TOKEN environment variable or from the
// file ~/.config/control-tower/token (0600). It is never printed, logged or accepted on the command line.
// Failure to send NEVER blocks project work: the script exits 0 with a warning unless --strict is given.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycby-YyosI2EYgvsaylDI1f82yFdTR7XuDHwRKshM-K9ODWadXWx3193GfiQKjItnrvqO/exec';

function arg(name, fallback = '') {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes('--' + name);
const strict = flag('strict');
const done = (msg, code = 0) => { console.error(msg); process.exit(strict ? code : 0); };

const project = arg('project');
const accessFailed = flag('access-failed');
const marker = arg('marker');
const evidence = arg('evidence');
if (!project) done('os-receipt: --project is required (skipping, not blocking)', 2);
if (!accessFailed && (!marker || !evidence)) done('os-receipt: --marker and --evidence are required unless --access-failed (skipping, not blocking)', 2);

let token = (process.env.CT_GATEWAY_TOKEN || '').trim();
if (!token) {
  try { token = readFileSync(join(homedir(), '.config', 'control-tower', 'token'), 'utf8').trim(); } catch {}
}
if (token.length < 32) done('os-receipt: no gateway token available — leave the OS columns as they are and report "OS sync not re-verified" in the run report', 3);

const body = {
  token,
  action: 'os_receipt',
  project_id: project,
  checked_at: arg('at', new Date().toISOString()),
  os_change_marker: marker,
  os_version_seen: arg('version'),
  evidence_url: evidence,
  access_failed: accessFailed,
  applied: arg('applied', 'true') !== 'false',
  notes: arg('notes').slice(0, 200),
};

try {
  const res = await fetch(process.env.CT_GATEWAY_URL || DEFAULT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { done('os-receipt: gateway returned non-JSON (deployment/URL problem)', 4); }
  if (!json.ok) done(`os-receipt: gateway rejected the receipt (${json.error || json.message || json.status})`, 5);
  console.log(`os-receipt recorded project=${project} alignment=${json.os_alignment || json.alignment || '?'} checked_at=${json.last_os_check || body.checked_at}`);
} catch (e) {
  done(`os-receipt: network failure (${e.name}) — project work is not blocked`, 6);
}
