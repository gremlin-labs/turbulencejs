import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }));
  return files.flat().filter(path => extname(path) === '.js');
}

const violations = [];
const sources = new Map();
for (const path of await sourceFiles(fileURLToPath(new URL('../src', import.meta.url)))) {
  const source = await readFile(path, 'utf8');
  sources.set(path, source);
  if (source.includes('._internal') || source.includes('_internal:')) {
    violations.push(`${path}: private controller internals are not allowed`);
  }
  if (/onComplete\s*:\s*undefined/.test(source)) {
    violations.push(`${path}: callbacks must not be disabled with onComplete: undefined`);
  }
  if (/onComplete\s*:[^\n]+\n\s*\.\.\.options/.test(source)) {
    violations.push(`${path}: spreading options after onComplete can overwrite cleanup`);
  }
  if (/[\\/]src[\\/](surfaces|effects|interact)[\\/]/.test(path) && source.includes('requestAnimationFrame')) {
    violations.push(`${path}: optional runtimes must consume timeline progress instead of owning requestAnimationFrame`);
  }
  if (/[\\/]src[\\/]interact[\\/]/.test(path) && !path.endsWith('/session.js') && source.includes('.addEventListener(')) {
    violations.push(`${path}: interaction listeners must be registered through the owning session`);
  }
}

function requireOwnership(pathSuffix, patterns) {
  const entry = [...sources.entries()].find(([path]) => path.endsWith(pathSuffix));
  if (!entry) { violations.push(`${pathSuffix}: required ownership source is missing`); return; }
  for (const [pattern, message] of patterns) {
    if (!pattern.test(entry[1])) violations.push(`${entry[0]}: ${message}`);
  }
}

requireOwnership('/src/core/timeline.js', [[/this\.scheduler\.schedule/, 'timeline must remain the playback clock through the shared scheduler'], [/this\.scheduler\.cancel/, 'timeline must cancel its shared frame subscription']]);
requireOwnership('/src/core/scheduler.js', [[/rafDriver/, 'browser scheduling must adapt the shared runtime driver'], [/callbacks = new Map/, 'browser scheduling must coalesce frame owners'], [/driver\.cancel/, 'shared scheduling must cancel its underlying frame when idle']]);
requireOwnership('/src/core/units.js', [[/render/, 'playback units require a render contract'], [/capabilities/, 'playback units require capability metadata']]);
requireOwnership('/src/turbscript/compiler.js', [[/AbortController/, 'drivers require an abort scope'], [/registeredCleanups/, 'driver setup requires rollback ownership']]);
requireOwnership('/src/surfaces/layer.js', [[/aria-hidden/, 'surface layers must be decorative'], [/pointerEvents:\s*'none'/, 'surface layers must not intercept input'], [/canvas\.remove\(\)/, 'surface layers must remove their canvas']]);
requireOwnership('/src/surfaces/worker.js', [[/message\.type === 'progress'/, 'surface worker must consume timeline progress'], [/message\.type === 'dispose'/, 'surface worker requires teardown protocol']]);
requireOwnership('/src/interact/session.js', [[/AbortController/, 'interaction sessions require abort ownership'], [/removeEventListener/, 'interaction sessions must remove listeners']]);
requireOwnership('/src/interact/drag.js', [[/capturePointer/, 'drag requires pointer capture'], [/releasePointer/, 'drag requires pointer release'], [/validationController\?\.abort/, 'drag must abort stale validation'], [/reducedMotion/, 'drag needs a reduced-motion semantic path']]);
requireOwnership('/src/interact/spring.js', [[/turb\.driver/, 'interaction spring must be timeline-driven']]);
requireOwnership('/src/recipes/effects.js', [[/context\.lifecycle\.cleanup/, 'generated recipe layers require lifecycle cleanup'], [/context\.reducedMotion/, 'visual recipes need reduced-motion allocation bypass']]);
requireOwnership('/src/animations/buttons.js', [[/dataset\.turbulencejsAggregateParticles/, 'legacy particles must use an aggregate layer'], [/onCancel:\s*cleanup/, 'legacy aggregate particles require cancellation cleanup']]);

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Lifecycle invariants verified.');
}
