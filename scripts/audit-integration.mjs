import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
};
const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();

for (const name of ['BeatVision', 'BeatVision-arena', 'BeatVision-recovery', 'BeatVision-Test']) {
  const dir = path.join(root, 'sources', name);
  check(`submodule ${name} exists`, existsSync(dir));
  if (existsSync(dir)) {
    try {
      check(`submodule ${name} is clean`, git(dir, ['status', '--porcelain']) === '', 'working tree contains changes');
      check(`submodule ${name} HEAD is pinned`, /^[0-9a-f]{40}$/.test(git(dir, ['rev-parse', 'HEAD'])));
    } catch (error) {
      check(`submodule ${name} git metadata`, false, String(error));
    }
  }
}

const app = path.join(root, 'app');
const required = [
  'frontend/package.json',
  'backend',
  'cloudflare-worker/src/index.js',
  'integrations/arena-provider/worker/src/arena-entry.ts',
  'integrations/arena-provider/provider-contracts.js',
  'integration-manifest.json'
];
for (const item of required) check(`assembled ${item}`, existsSync(path.join(app, item)));

const backendServer = path.join(app, 'backend', 'server.py');
if (existsSync(backendServer)) {
  const backendText = readFileSync(backendServer, 'utf8');
  check('backend treats Emergent SDK as optional', backendText.includes('except ImportError:') && backendText.includes('LlmChat = None'));
  check('backend guards missing optional SDK', backendText.includes('Optional Emergent LLM SDK is not installed'));
}
const backendRequirements = path.join(app, 'backend', 'requirements.txt');
if (existsSync(backendRequirements)) {
  const requirements = readFileSync(backendRequirements, 'utf8');
  check('backend requirements omit unavailable Emergent SDK', !/^emergentintegrations==/im.test(requirements));
}

if (existsSync(path.join(app, 'integration-manifest.json'))) {
  try {
    const manifest = JSON.parse(readFileSync(path.join(app, 'integration-manifest.json'), 'utf8'));
    check('manifest identifies Recovery baseline', manifest.activeBaseline === 'BeatVision-recovery');
    check('manifest has all source commits', ['recovery', 'arena', 'test', 'original'].every(k => /^[0-9a-f]{40}$/.test(manifest.commits?.[k] || '')));
    check('manifest records optional provider hardening', manifest.hardening?.optionalEmergentSdk === true);
  } catch (error) {
    check('manifest JSON', false, String(error));
  }
}

const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
check('root verify script exists', typeof packageJson.scripts?.verify === 'string');
check('root assemble script exists', typeof packageJson.scripts?.assemble === 'string');

console.log('\nBeatVision-rec integration audit');
for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
if (failures.length) {
  console.error(`\n${failures.length} audit check(s) failed.`);
  process.exit(1);
}
console.log(`\nPASS  ${checks.length} integration checks`);
