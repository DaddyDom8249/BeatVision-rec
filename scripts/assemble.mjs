import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const sources = path.join(root, 'sources');
const recovery = path.join(sources, 'BeatVision-recovery');
const arena = path.join(sources, 'BeatVision-arena');
const test = path.join(sources, 'BeatVision-Test');
const original = path.join(sources, 'BeatVision');
const out = path.join(root, 'app');

function git(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
}
function required(dir, label) {
  if (!existsSync(dir)) throw new Error(`Missing ${label}. Clone with --recurse-submodules.`);
}

required(recovery, 'sources/BeatVision-recovery');
required(arena, 'sources/BeatVision-arena');
required(test, 'sources/BeatVision-Test');
required(original, 'sources/BeatVision');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// Recovery is the active application baseline because it contains the current
// full workflow, persistence, backend, worker, and rendering pipeline.
for (const name of ['frontend', 'backend', 'cloudflare-worker', 'scripts', 'design_guidelines.json', 'memory', 'tests', 'test_reports']) {
  const src = path.join(recovery, name);
  if (existsSync(src)) await cp(src, path.join(out, name), { recursive: true });
}

// Arena is integrated as the provider/motion execution layer. Keeping it under
// integrations avoids silently replacing the proven Recovery application while
// making every provider contract and gateway implementation available to the
// integration build.
const arenaOut = path.join(out, 'integrations', 'arena-provider');
await mkdir(arenaOut, { recursive: true });
for (const name of ['worker', 'provider-contracts.js', 'animation-bridge.js', 'motion-bridge.js', 'log-guard.js']) {
  const src = path.join(arena, name);
  if (existsSync(src)) await cp(src, path.join(arenaOut, name), { recursive: true });
}

// Preserve presentation/provider documentation as integration references.
const refs = path.join(out, 'integrations', 'references');
await mkdir(refs, { recursive: true });
for (const name of ['ARCHITECTURE.md', 'DEMO_READINESS.md', 'PROVIDER_BRIEF.md', 'PROVIDER_SCORECARD.md', 'SPONSOR_INTEGRATION.md', 'SECURITY.md']) {
  const src = path.join(test, name);
  if (existsSync(src)) await cp(src, path.join(refs, name));
}

const commits = {
  recovery: git(recovery, ['rev-parse', 'HEAD']),
  arena: git(arena, ['rev-parse', 'HEAD']),
  test: git(test, ['rev-parse', 'HEAD']),
  original: git(original, ['rev-parse', 'HEAD']),
};

await writeFile(path.join(out, 'integration-manifest.json'), JSON.stringify({
  integration: 'BeatVision-rec',
  activeBaseline: 'BeatVision-recovery',
  commits,
  components: {
    workflow: 'Recovery frontend/backend/worker',
    providerExecution: 'Arena worker/provider contracts integrated under integrations/arena-provider',
    presentationReferences: 'BeatVision-Test documentation under integrations/references',
    originalProductionReference: 'BeatVision preserved as immutable submodule'
  },
  policy: 'Source repositories are read-only; integration changes belong in BeatVision-rec.'
}, null, 2) + '\n');

console.log('BeatVision-rec assembled into ./app');
console.log(`Recovery: ${commits.recovery}`);
console.log(`Arena:    ${commits.arena}`);
console.log(`Test:     ${commits.test}`);
console.log(`Original: ${commits.original}`);
