import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), 'turbulencejs-package-'));

try {
  const packOutput = execFileSync('npm', ['pack', '--json', '--pack-destination', temporary], { cwd: root, encoding: 'utf8' });
  const [{ filename }] = JSON.parse(packOutput);
  execFileSync('tar', ['-xzf', join(temporary, filename), '-C', temporary]);
  const packageRoot = join(temporary, 'package');
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const esm = await import(pathToFileURL(join(packageRoot, manifest.module)).href);
  const require = createRequire(import.meta.url);
  const commonjs = require(join(packageRoot, manifest.main));
  if (typeof esm.animate !== 'function' || typeof commonjs.animate !== 'function') throw new Error('Import/require entry points do not expose animate().');
  if (!esm.turb.isTurb(esm.turb.driver(() => () => {}, { duration: 1 }))) throw new Error('Packed ESM driver authoring failed.');
  if (!commonjs.turb.isTurb(commonjs.turb.mark('packed'))) throw new Error('Packed CommonJS mark authoring failed.');

  const expectedPacks = {
    cartoon: ['bubbleIn', 'skedaddle'],
    cinematic: ['card3D', 'cinematicSlide'],
    subtle: ['softReveal', 'gentleSettle'],
    extreme: ['impactBubble', 'spinAway'],
    surfaces: ['surface', 'program', 'dissolve', 'source'],
    effects: ['snaporate', 'enhance', 'sidebarReady', 'tetrisLoad'],
    interact: ['interact', 'hover', 'drag', 'createInteractionSession'],
    runtime: ['Turbulence', 'Tween', 'Spring', 'Ticker', 'manualDriver', 'interpolate', 'sequence'],
    dom: ['Turbulence', 'createEngine', 'DomAnimator', 'detectReducedMotion', 'transformCss'],
    main: ['Turbulence', 'createEngine', 'BoundsAnimator', 'Layout', 'safeSetBounds']
  };
  const packSizes = {};
  const packedModules = {};
  for (const [name, exports] of Object.entries(expectedPacks)) {
    const entry = manifest.exports[`./${name}`];
    const imported = await import(`${pathToFileURL(join(packageRoot, entry.import)).href}?verify=${Date.now()}`);
    const required = require(join(packageRoot, entry.require));
    for (const exported of exports) {
      if (!(exported in imported) || !(exported in required)) throw new Error(`${name} pack does not expose ${exported} through import and require.`);
    }
    const code = await readFile(join(packageRoot, entry.import));
    const commonjsCode = await readFile(join(packageRoot, entry.require), 'utf8');
    packSizes[name] = { raw: code.byteLength, gzip: gzipSync(code).byteLength };
    packedModules[name] = { imported, required };
    if (!code.toString().includes("from 'turbulencejs'") && name !== 'subtle' && name !== 'extreme' && name !== 'runtime') {
      throw new Error(`${name} ESM pack does not externalize the root Turbulence runtime.`);
    }
    if (!commonjsCode.includes("require('turbulencejs')") && name !== 'subtle' && name !== 'extreme' && name !== 'runtime') {
      throw new Error(`${name} CommonJS pack does not externalize the root Turbulence runtime.`);
    }
    await readFile(join(packageRoot, entry.types), 'utf8');
  }

  const pixels = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
  for (const [module, grammar] of [[packedModules.surfaces.imported, esm.turb], [packedModules.surfaces.required, commonjs.turb]]) {
    if (!grammar.isTurb(module.dissolve.out(module.source.imageData(pixels)))) throw new Error('Packed surfaces could not author a Turb.');
  }
  for (const [module, grammar] of [[packedModules.effects.imported, esm.turb], [packedModules.effects.required, commonjs.turb]]) {
    if (!grammar.isTurb(module.sidebarReady({ finish: 'none' }))) throw new Error('Packed effects could not author a coordinator Turb.');
  }
  for (const module of [packedModules.interact.imported, packedModules.interact.required]) {
    const session = module.createInteractionSession();
    session.destroy();
    if (session.state !== 'destroyed') throw new Error('Packed interaction session did not destroy cleanly.');
  }

  const mainEntry = manifest.exports['./main'];
  const poisonGlobals = `for (const name of ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error('main entry accessed ' + name); } });`;
  execFileSync(process.execPath, ['--input-type=module', '--eval', `${poisonGlobals}\nawait import(${JSON.stringify(pathToFileURL(join(packageRoot, mainEntry.import)).href)});`], { stdio: 'pipe' });
  execFileSync(process.execPath, ['--eval', `${poisonGlobals}\nrequire(${JSON.stringify(join(packageRoot, mainEntry.require))});`], { stdio: 'pipe' });

  const browserCode = await readFile(join(packageRoot, manifest.browser), 'utf8');
  const browserContext = { console, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {} };
  browserContext.globalThis = browserContext;
  runInNewContext(browserCode, browserContext);
  if (typeof browserContext.turbulencejs?.animate !== 'function') throw new Error('Browser bundle does not expose turbulencejs.animate().');

  const gzipBytes = gzipSync(browserCode).byteLength;
  const workerCode = await readFile(join(packageRoot, manifest.exports['./surface-worker'].import), 'utf8');
  if (workerCode.includes('requestAnimationFrame')) throw new Error('Surface worker must consume progress and never own an animation frame clock.');
  await readFile(join(packageRoot, manifest.exports['./surface-worker'].require), 'utf8');
  if (browserCode.includes('SURFACE_TAINTED_PIXELS') || browserCode.includes('turbulencejsSurfaceBlocks')) {
    throw new Error('Optional surface runtime leaked into the core browser UMD.');
  }
  const workerBytes = gzipSync(workerCode).byteLength;
  const historicalReference = 20 * 1024;
  await readFile(join(packageRoot, manifest.types), 'utf8');
  const distFiles = await readdir(join(packageRoot, 'dist'));
  for (const requiredFile of ['turbulencejs.esm.js', 'turbulencejs.cjs', 'turbulencejs.min.js', 'index.d.ts', 'runtime.js', 'runtime.cjs', 'runtime.d.ts', 'dom.js', 'dom.cjs', 'dom.d.ts', 'main.js', 'main.cjs', 'main.d.ts', 'surfaces.js', 'surfaces.cjs', 'surfaces.d.ts', 'effects.js', 'effects.cjs', 'effects.d.ts', 'interact.js', 'interact.cjs', 'interact.d.ts', 'surface-worker.js']) {
    if (!distFiles.includes(requiredFile)) throw new Error(`Packed file list is missing ${requiredFile}.`);
  }
  const measuredPacks = Object.entries(packSizes).map(([name, size]) => `${name} ${size.raw} raw/${size.gzip} gzip`).join(', ');
  console.log(`Package verified: root and recipe-pack import/require/types, browser UMD, surface worker; core browser gzip ${gzipBytes} bytes (historical reference ${historicalReference}, informational only); pack ESM sizes: ${measuredPacks}; worker gzip ${workerBytes}.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
