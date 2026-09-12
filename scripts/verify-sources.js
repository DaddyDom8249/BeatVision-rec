const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'sources/BeatVision/.git',
  'sources/BeatVision-arena/.git',
  'sources/BeatVision-recovery/.git',
  'sources/BeatVision-Test/.git'
];

let ok = true;
for (const rel of required) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  } else {
    console.log(`OK: ${rel}`);
  }
}

if (!fs.existsSync(path.join(root, '.gitmodules'))) {
  console.error('MISSING: .gitmodules');
  ok = false;
}

if (!ok) {
  console.error('\nInitialize the workspace with: git submodule update --init --recursive');
  process.exit(1);
}
console.log('\nBeatVision-rec source integrity check passed.');
