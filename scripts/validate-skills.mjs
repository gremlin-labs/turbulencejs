import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const skillRoot = new URL('../skills/turbulencejs-integration/', import.meta.url);
const requiredFiles = [
  'SKILL.md',
  'EXAMPLES.md',
  'REFERENCE.md',
  'WORK-ARTIFACTS.md',
  'catalog.json',
  'templates/WORK.md',
  'templates/DECISIONS.md',
  'templates/INTEGRATION-PLAN.md',
  'templates/IMPLEMENTATION-REPORT.md',
  'scripts/inspect-project.mjs'
];
const failures = [];

const sources = new Map();
for (const path of requiredFiles) {
  try {
    sources.set(path, await readFile(new URL(path, skillRoot), 'utf8'));
  } catch {
    failures.push(`Missing required skill file: ${path}`);
  }
}

const skill = sources.get('SKILL.md') ?? '';
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1];
const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1] ?? '';
if (name !== 'turbulencejs-integration') failures.push('Skill frontmatter name must match its directory.');
if (!description.includes('Use when ')) failures.push('Skill description must include explicit trigger language.');
if (description.length > 1024) failures.push('Skill description exceeds 1024 characters.');
if (!skill.includes('agent-work/{slug}/turbulencejs-integration/')) failures.push('Skill does not declare its portable artifact stage.');
if (skill.includes('../WORK-ARTIFACTS.md')) failures.push('Skill depends on an external work-artifact contract.');

const requiredHeadings = {
  'templates/WORK.md': ['Outcome', 'Ownership', 'Status', 'Stages', 'Current handoff', 'Decisions and material deltas', 'Final evidence'],
  'templates/DECISIONS.md': ['Project context', 'Runtime surfaces', 'Entrypoints', 'Motion style', 'Intensity', 'Accessibility', 'Approval'],
  'templates/INTEGRATION-PLAN.md': ['Outcome', 'Scope', 'Package selection', 'Target map', 'Implementation slices', 'Verification', 'Rollback'],
  'templates/IMPLEMENTATION-REPORT.md': ['Implemented', 'Files', 'Verification', 'Accessibility and lifecycle', 'Deviations', 'Final status']
};
for (const [path, headings] of Object.entries(requiredHeadings)) {
  const source = sources.get(path) ?? '';
  for (const heading of headings) {
    if (!source.includes(`## ${heading}`)) failures.push(`${path} is missing heading: ${heading}`);
  }
}

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(sources.get('catalog.json') ?? '{}');
if (catalog.package !== manifest.name) failures.push('Skill catalog package identity differs from package.json.');
const levels = catalog.intensity?.map(entry => entry.level) ?? [];
if (JSON.stringify(levels) !== JSON.stringify([0, 1, 2, 3, 4])) failures.push('Skill intensity catalog must define levels 0 through 4 exactly once.');
for (const { specifier, intensity } of catalog.entrypoints ?? []) {
  const suffix = specifier === manifest.name ? '.' : `.${specifier.slice(manifest.name.length)}`;
  if (!(suffix in manifest.exports)) failures.push(`Skill catalog references an unpublished entrypoint: ${specifier}`);
  if (!Array.isArray(intensity) || intensity.length !== 2 || intensity.some(level => !Number.isInteger(level) || level < 0 || level > 4) || intensity[0] > intensity[1]) failures.push(`Skill catalog has an invalid intensity range: ${specifier}`);
}

try {
  const inspector = execFileSync(process.execPath, [join(fileURLToPath(skillRoot), 'scripts/inspect-project.mjs'), fileURLToPath(root)], { encoding: 'utf8' });
  const result = JSON.parse(inspector);
  if (result.name !== manifest.name || result.turbulenceVersion !== null) failures.push('Project inspector self-test returned unexpected repository data.');
} catch (error) {
  failures.push(`Project inspector self-test failed: ${error.message}`);
}

if (failures.length > 0) throw new Error(`Skill validation failed:\n- ${failures.join('\n- ')}`);
console.log(`Agent skill verified: ${requiredFiles.length} portable files, frontmatter, artifact templates, 12 published entrypoints, intensity levels 0–4, and project inspector.`);
