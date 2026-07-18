import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowedHistory = new Set(['MIGRATION.md', 'PROVENANCE.md']);
const oldNames = [
  ['her', 'ky'].join(''),
  ['herk', 'script'].join('')
];
const ignoredDirectories = new Set(['.git', 'coverage', 'node_modules']);
const scannedExtensions = new Set(['.cjs', '.css', '.d.ts', '.html', '.js', '.json', '.md', '.mjs', '.ts']);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const files = await walk(root);
const failures = [];

for (const absolute of files) {
  const path = relative(root, absolute);
  const normalizedPath = path.toLowerCase();
  if (!allowedHistory.has(path) && oldNames.some(name => normalizedPath.includes(name))) {
    failures.push(`Historical name remains in path: ${path}`);
  }

  const extension = path.endsWith('.d.ts') ? '.d.ts' : extname(path);
  if (!scannedExtensions.has(extension)) continue;
  if (allowedHistory.has(path)) continue;
  const source = await readFile(absolute, 'utf8');
  for (const oldName of oldNames) {
    if (source.toLowerCase().includes(oldName)) failures.push(`Historical name remains in ${path}`);
  }
}

const markdownFiles = files.filter(path => extname(path) === '.md');
const linkPattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
for (const markdownFile of markdownFiles) {
  const source = await readFile(markdownFile, 'utf8');
  for (const match of source.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (!rawTarget || rawTarget.startsWith('#') || /^[a-z][a-z+.-]*:/i.test(rawTarget)) continue;
    const target = decodeURIComponent(rawTarget.split('#')[0]);
    if (!target) continue;
    const resolved = resolve(dirname(markdownFile), target);
    try {
      await access(resolved);
    } catch {
      failures.push(`Broken relative link in ${relative(root, markdownFile)}: ${rawTarget}`);
    }
  }
}

const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (manifest.name !== 'turbulencejs' || manifest.version !== '2.0.0') failures.push('Package identity must be turbulencejs@2.0.0.');
if (Object.keys(manifest.dependencies ?? {}).length > 0) failures.push('Runtime dependencies must remain empty.');

if (failures.length > 0) {
  throw new Error(`Documentation/release checks failed:\n- ${[...new Set(failures)].join('\n- ')}`);
}

console.log(`Documentation verified: ${markdownFiles.length} Markdown files, relative links, package identity, zero runtime dependencies, and public terminology.`);
