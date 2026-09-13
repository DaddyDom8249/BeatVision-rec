import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
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

// Arena provider code is preserved under integrations as an optional reference.
// It is not silently substituted for the active Recovery provider path.
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

// The Recovery backend historically imported the optional Emergent SDK at
// module-load time. That makes the whole API fail to boot when the package is
// unavailable, even though every text-generation route already has a safe
// deterministic fallback. In the integration build the SDK is therefore
// optional: absence is treated exactly like an unavailable provider.
const backendServer = path.join(out, 'backend', 'server.py');
if (existsSync(backendServer)) {
  let source = await readFile(backendServer, 'utf8');
  source = source.replace(
    'from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent',
    'try:\n    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent\nexcept ImportError:\n    LlmChat = None\n    UserMessage = None\n    ImageContent = None'
  );
  source = source.replace(
    '    if not EMERGENT_LLM_KEY:\n        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured on server.")',
    '    if not EMERGENT_LLM_KEY:\n        raise RuntimeError("EMERGENT_LLM_KEY not configured on server")\n    if LlmChat is None:\n        raise RuntimeError("Optional Emergent LLM SDK is not installed")'
  );
  await writeFile(backendServer, source);
}

const backendRequirements = path.join(out, 'backend', 'requirements.txt');
if (existsSync(backendRequirements)) {
  const requirements = await readFile(backendRequirements, 'utf8');
  await writeFile(
    backendRequirements,
    requirements
      .split(/\r?\n/)
      .filter((line) => !/^emergentintegrations==/i.test(line.trim()))
      .join('\n')
  );
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
    providerExecution: 'Recovery provider path is active; Arena worker/provider contracts are preserved as optional integration references',
    presentationReferences: 'BeatVision-Test documentation under integrations/references',
    originalProductionReference: 'BeatVision preserved as immutable submodule'
  },
  hardening: {
    optionalEmergentSdk: true,
    behaviorWhenMissing: 'provider unavailable -> existing deterministic fallback path'
  },
  policy: 'Source repositories are read-only; integration changes belong in BeatVision-rec.'
}, null, 2) + '\n');

await import('./integration-overrides.mjs');

console.log('BeatVision-rec assembled into ./app');
console.log(`Recovery: ${commits.recovery}`);
console.log(`Arena:    ${commits.arena}`);
console.log(`Test:     ${commits.test}`);
console.log(`Original: ${commits.original}`);
