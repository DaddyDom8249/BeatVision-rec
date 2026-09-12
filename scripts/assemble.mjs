import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const recovery = path.join(root, 'sources', 'BeatVision-recovery');
const arena = path.join(root, 'sources', 'BeatVision-arena');
const out = path.join(root, 'app');
if (!existsSync(recovery)) throw new Error('Missing sources/BeatVision-recovery. Clone with --recurse-submodules.');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(recovery, 'frontend'), path.join(out, 'frontend'), { recursive: true });
for (const name of ['backend','cloudflare-worker','scripts']) {
  const src = path.join(recovery, name);
  if (existsSync(src)) await cp(src, path.join(out, name), { recursive: true });
}
let arenaCommit = 'unavailable';
if (existsSync(arena)) { try { arenaCommit = execFileSync('git',['-C',arena,'rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch {} }
const recoveryCommit = execFileSync('git',['-C',recovery,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
await writeFile(path.join(out,'integration-manifest.json'), JSON.stringify({integration:'BeatVision-rec',baseline:'BeatVision-recovery',baselineCommit:recoveryCommit,arenaCommit,policy:'Source repositories are read-only; integration changes belong in BeatVision-rec.'},null,2)+'\n');
console.log('BeatVision-rec assembled into ./app');
