// Verifies which gateway contract is DEPLOYED, without any token.
//   node google-apps-script/control-tower-gateway/verify-deployment.mjs [web-app-url]
// The URL defaults to the one compiled into the Android client. Exit 0 when contract_version >= 5 (OS alignment + ideas planning, gateway 0.10.0).
import { readFileSync } from 'node:fs';

const fromGradle = readFileSync(new URL('../../control-tower-android/app/build.gradle', import.meta.url), 'utf8')
  .match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/);
const url = process.argv[2] || (fromGradle && fromGradle[0]);
if (!url) { console.error('no gateway url'); process.exit(2); }

const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'health' }), redirect: 'follow' });
const text = await res.text();
let body;
try { body = JSON.parse(text); } catch { console.error('gateway returned non-JSON (deployment not "Anyone" or wrong URL)'); process.exit(3); }
const contract = body.contract_version ?? 1;
console.log(`deployed gateway: error=${body.error ?? '-'} gateway_version=${body.gateway_version ?? '(pre-0.7)'} contract_version=${contract}`);
if (body.error !== 'unauthorized') { console.error('unexpected reply; expected unauthorized without a token'); process.exit(4); }
process.exit(contract >= 5 ? 0 : 1);
