import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const temporary = await mkdtemp(join(tmpdir(), 'turbulencejs-consumers-'));
const run = (file, args, cwd) => execFileSync(file, args, { cwd, encoding: 'utf8', stdio: 'pipe' });

try {
  run('npm', ['run', 'build'], root);
  const [{ filename }] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temporary], root));
  const tarball = join(temporary, filename);
  const consumer = join(temporary, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);

  await writeFile(join(consumer, 'esm.mjs'), `
import turbulencejs, { Turbulence, manualDriver } from 'turbulencejs';
import runtime from 'turbulencejs/runtime';
import dom, { DomAnimator } from 'turbulencejs/dom';
import main, { BoundsAnimator, Layout } from 'turbulencejs/main';
const driver = manualDriver();
const engine = new Turbulence({ driver });
const style = { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } };
const element = { style };
const animator = new DomAnimator(engine);
const domHandle = animator.animate(element, { x: 20, opacity: 0.5 }, { duration: 32, easing: 'linear' });
for (let i = 0; i < 5; i++) driver.step(16);
if (!(await domHandle.finished).finished || style.opacity !== '0.5') throw new Error('ESM DOM consumer failed');
let bounds = { x: 0, y: 0, width: 100, height: 100 };
const target = { getBounds: () => ({ ...bounds }), setBounds: value => { bounds = value; }, isDestroyed: () => false };
const boundsHandle = new BoundsAnimator(engine).animate(target, { x: 10, y: 0, width: 90, height: 100 }, { duration: 32, easing: 'linear' });
for (let i = 0; i < 5; i++) driver.step(16);
if (!(await boundsHandle.finished).finished || bounds.x !== 10) throw new Error('ESM main consumer failed');
const layout = new Layout(engine, state => ({ left: { x: 0, y: 0, width: state.width, height: 10 } }));
layout.set({ width: 10 });
if (layout.get('left').width !== 10) throw new Error('ESM layout consumer failed');
if (!turbulencejs.turb || !runtime.Tween || !dom.animate || !main.manualDriver) throw new Error('ESM namespace shape failed');
animator.dispose(); layout.dispose(); engine.dispose();
`);

  await writeFile(join(consumer, 'cjs.cjs'), `
const root = require('turbulencejs');
const runtime = require('turbulencejs/runtime');
const dom = require('turbulencejs/dom');
const main = require('turbulencejs/main');
if (!root.Turbulence || !runtime.manualDriver || !dom.DomAnimator || !main.BoundsAnimator || !main.Layout) throw new Error('CommonJS contract failed');
const driver = root.manualDriver();
const engine = new root.Turbulence({ driver, reducedMotion: true });
let value = 0;
(async () => {
  const tween = engine.tween({ from: 0, to: 1, duration: 100, onUpdate: next => { value = next; } });
  const result = await tween.finished;
  if (!result.finished || value !== 1 || !engine.idle) throw new Error('CommonJS reduced-motion runtime failed');
})().catch(error => { console.error(error); process.exitCode = 1; });
`);

  run(process.execPath, ['esm.mjs'], consumer);
  run(process.execPath, ['cjs.cjs'], consumer);

  const vite = join(temporary, 'vite');
  await mkdir(vite);
  await writeFile(join(vite, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], vite);
  await writeFile(join(vite, 'index.html'), '<main id="app"></main><script type="module" src="/main.js"></script>');
  await writeFile(join(vite, 'main.js'), `
import { Turbulence, rafDriver, turb } from 'turbulencejs';
import { DomAnimator } from 'turbulencejs/dom';
const engine = new Turbulence({ driver: rafDriver(), reducedMotion: true });
new DomAnimator(engine).animate(document.querySelector('#app'), { opacity: 1 });
document.querySelector('#app').dataset.turb = String(turb.isTurb(turb.wait(0)));
`);
  const viteBinary = join(root, 'examples/showcase/node_modules/.bin/vite');
  run(viteBinary, ['build'], vite);
  const html = await readFile(join(vite, 'dist/index.html'), 'utf8');
  if (!html.includes('assets/')) throw new Error('Vite consumer did not emit a bundled asset.');

  console.log('Packed consumers verified: ESM, CommonJS, declarations/package exports, and Vite production build.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
