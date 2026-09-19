// Regenerates CombinedCode.gs from the canonical modular files.
//   node google-apps-script/control-tower-gateway/build-combined.mjs          # write
//   node google-apps-script/control-tower-gateway/build-combined.mjs --check  # exit 1 if out of date
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ORDER = ['Config.gs', 'Portfolio.gs', 'Os.gs', 'Activity.gs', 'Inbox.gs', 'Ideas.gs', 'Devices.gs', 'Push.gs', 'Scanner.gs', 'Code.gs'];

export function combined() {
  const header = `/**
 * MANUAL DEPLOYMENT HELPER — generated from the canonical modular gateway files.
 * Paste this entire file into Apps Script Code.gs when deploying manually.
 * Canonical source remains the sibling modular files in this repository.
 * Regenerate with: node google-apps-script/control-tower-gateway/build-combined.mjs
 */
`;
  return header + ORDER.map((f) => `\n\n/* ===== ${f} ===== */\n\n${readFileSync(join(here, f), 'utf8').trimEnd()}\n`).join('');
}

const target = join(here, 'CombinedCode.gs');
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const next = combined();
  if (process.argv.includes('--check')) {
    const current = readFileSync(target, 'utf8');
    if (current.replace(/\r\n/g, '\n') !== next.replace(/\r\n/g, '\n')) {
      console.error('CombinedCode.gs is out of date. Run: node google-apps-script/control-tower-gateway/build-combined.mjs');
      process.exit(1);
    }
    console.log('CombinedCode.gs is up to date');
  } else {
    writeFileSync(target, next);
    console.log(`wrote ${target} (${next.length} chars)`);
  }
}
