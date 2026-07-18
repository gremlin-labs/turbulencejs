import { readFile } from 'node:fs/promises';
import { createEasing } from '../src/core/easing.js';
import { motionRoles } from '../src/core/motion.js';

const expectedRoles = ['feedbackFast', 'stateEnter', 'stateExit', 'spatialMove', 'emphasizedExplain', 'gestureSettle', 'ambient', 'celebration'];
const families = ['buttons', 'dialogs', 'dropdowns', 'forms', 'loading', 'toasts'];
const recipeFiles = ['cartoon', 'cinematic', 'subtle', 'extreme', 'effects'];
const failures = [];

for (const role of expectedRoles) if (!motionRoles[role]) failures.push(`Missing motion role: ${role}`);
const warnings = [];
const originalWarn = console.warn;
console.warn = message => warnings.push(String(message));
for (const family of families) {
  const source = await readFile(new URL(`../src/animations/${family}.js`, import.meta.url), 'utf8');
  if (!source.includes('motionOptions(')) failures.push(`${family}.js does not consume a semantic motion role.`);
  for (const match of source.matchAll(/easing:\s*['"]([^'"]+)['"]/g)) createEasing(match[1]);
}
for (const recipe of Object.values(motionRoles)) createEasing(recipe.easing);
for (const recipe of recipeFiles) {
  const source = await readFile(new URL(`../src/recipes/${recipe}.js`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/easing:\s*['"]([^'"]+)['"]/g)) createEasing(match[1]);
}
const turbulenceSource = await readFile(new URL('../src/recipes/effects.js', import.meta.url), 'utf8');
for (const capability of ['snaporate', 'enhance', 'sidebarReady', 'tetrisLoad']) {
  if (!turbulenceSource.includes(capability)) failures.push(`Turbulence recipe is missing ${capability}.`);
}
if (!turbulenceSource.includes('context.reducedMotion')) failures.push('Turbulence recipes do not expose reduced-motion endpoints.');
console.warn = originalWarn;
failures.push(...warnings);

if (failures.length) {
  failures.forEach(failure => console.error(failure));
  process.exitCode = 1;
} else {
  console.log(`Motion system verified: ${expectedRoles.length} roles, ${families.length} preset families, ${recipeFiles.length} TurbScript packs, all literal easings resolve.`);
}
