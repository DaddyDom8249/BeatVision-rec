import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'app', 'frontend', 'src');
const failures = [];
const sourceFiles = new Set();
const referencedFiles = new Set();

const ignoredDirectories = new Set(['node_modules', 'build', 'coverage', 'test_reports']);
const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx'];
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.md', '.json']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (sourceExtensions.includes(path.extname(entry.name))) sourceFiles.add(full);
  }
}

function candidates(importer, specifier) {
  const base = specifier.startsWith('@/')
    ? path.join(src, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);
  return [base, ...sourceExtensions.map((ext) => `${base}${ext}`), ...sourceExtensions.map((ext) => path.join(base, `index${ext}`))];
}

function addReference(importer, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return;
  for (const candidate of candidates(importer, specifier)) {
    if (sourceFiles.has(candidate)) {
      referencedFiles.add(candidate);
      return;
    }
  }
}

await walk(src);

for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g)) {
    addReference(file, match[1]);
  }
  for (const match of text.matchAll(/(?:require|import)\(\s*["']([^"']+)["']\s*\)/g)) {
    addReference(file, match[1]);
  }
}

const roots = [path.join(src, 'index.js'), path.join(src, 'App.js')];
for (const rootFile of roots) if (sourceFiles.has(rootFile)) referencedFiles.add(rootFile);

for (const file of sourceFiles) {
  const relative = path.relative(src, file).replaceAll(path.sep, '/');
  if (relative.startsWith('components/ui/')) continue;
  if (relative.startsWith('__tests__/') || relative.endsWith('.test.js') || relative.endsWith('.test.jsx')) continue;
  if (!referencedFiles.has(file)) failures.push(`Orphan frontend source file: ${relative}`);
}

const typoPatterns = [
  /\brecieve\b/gi,
  /\bseperate\b/gi,
  /\boccured\b/gi,
  /\bdefinately\b/gi,
  /\bdefinately\b/gi,
  /\buntill\b/gi,
  /\bwich\b/gi,
  /\bteh\b/gi,
  /\bcalender\b/gi,
  /\bacheive\b/gi,
  /\boccurence\b/gi,
];

async function scanText(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await scanText(full);
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) continue;
    const text = await readFile(full, 'utf8');
    for (const pattern of typoPatterns) {
      const match = pattern.exec(text);
      if (match) failures.push(`Likely spelling error in ${path.relative(root, full).replaceAll(path.sep, '/')}: ${match[0]}`);
    }
  }
}

await scanText(path.join(root, 'app'));

if (failures.length) {
  console.error('BeatVision frontend hygiene audit failed:');
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`PASS  Frontend hygiene audit: ${sourceFiles.size} source files checked; no orphan non-UI modules or known spelling errors found.`);
