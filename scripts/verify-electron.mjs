import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const electron = process.env.ELECTRON_BIN || 'electron';
const temporary = await mkdtemp(join(tmpdir(), 'turbulencejs-electron-'));
const run = (file, args, cwd, options = {}) => execFileSync(file, args, { cwd, encoding: 'utf8', stdio: 'pipe', ...options });

try {
  run(electron, ['--version'], root);
  run('npm', ['run', 'build'], root);
  const [{ filename }] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temporary], root));
  const fixture = join(temporary, 'fixture');
  await mkdir(fixture);
  await writeFile(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'commonjs' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(temporary, filename)], fixture);

  await writeFile(join(fixture, 'renderer.html'), `<!doctype html><body><div id="target"></div><script>
  const { ipcRenderer } = require('electron');
  const { createEngine, DomAnimator } = require('turbulencejs/dom');
  (async () => {
    const target = document.querySelector('#target');
    const engine = createEngine({ reducedMotion: false });
    const animator = new DomAnimator(engine);
    const first = animator.animate(target, { x: 100, opacity: 0.5 }, { duration: 100, easing: 'linear' });
    setTimeout(() => animator.animate(target, { x: 0, opacity: 1 }, { duration: 60, easing: 'linear' }), 20);
    const result = await first.finished;
    const cancelled = animator.animate(target, { y: 100 }, { duration: 1000 });
    cancelled.cancel();
    const cancelResult = await cancelled.finished;
    const reducedEngine = createEngine({ reducedMotion: true });
    const reducedAnimator = new DomAnimator(reducedEngine);
    const reducedResult = await reducedAnimator.animate(target, { x: 10 }, { duration: 500 }).finished;
    animator.dispose(); engine.dispose(); reducedAnimator.dispose(); reducedEngine.dispose();
    ipcRenderer.send('turbulence-smoke', { result, cancelResult, reducedResult, transform: target.style.transform, opacity: target.style.opacity, idle: engine.idle && reducedEngine.idle });
  })().catch(error => ipcRenderer.send('turbulence-smoke', { error: error.stack || String(error) }));
  </script></body>`);

  await writeFile(join(fixture, 'main.cjs'), `
const { app, BrowserWindow, ipcMain } = require('electron');
const { createEngine, BoundsAnimator, Layout } = require('turbulencejs/main');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const timeout = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('Electron smoke timed out')), ms));
app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({ show: false, width: 420, height: 320, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) errors.push(message); });
  const renderer = new Promise(resolve => ipcMain.once('turbulence-smoke', (_event, payload) => resolve(payload)));
  const engine = createEngine({ fps: 120 });
  const bounds = new BoundsAnimator(engine);
  const original = win.getBounds();
  const first = bounds.animate(win, { ...original, x: original.x + 8 }, { duration: 100, easing: 'linear' });
  setTimeout(() => bounds.animate(win, original, { duration: 60, easing: 'linear' }), 20);
  const layout = new Layout(engine, state => ({ left: { x: 0, y: 0, width: state.split, height: 100 }, right: { x: state.split, y: 0, width: 300 - state.split, height: 100 } }));
  const seams = [];
  let left;
  layout.onRegion('left', rect => { left = rect; });
  layout.onRegion('right', rect => { if (left) seams.push(left.x + left.width === rect.x); });
  layout.set({ split: 40 });
  const layoutPlay = layout.animateTo({ split: 120 }, { duration: 80, easing: 'linear' });
  await win.loadURL(pathToFileURL(path.join(__dirname, 'renderer.html')).href);
  const [boundsResult, layoutResult, rendererResult] = await Promise.race([Promise.all([first.finished, layoutPlay.finished, renderer]), timeout(15000)]);
  if (!boundsResult.finished || !layoutResult.finished || rendererResult.error || !rendererResult.result.finished || !rendererResult.cancelResult.cancelled || !rendererResult.reducedResult.finished || !rendererResult.idle || seams.some(value => !value) || errors.length) {
    throw new Error(JSON.stringify({ boundsResult, layoutResult, rendererResult, seams, errors }));
  }
  bounds.dispose(); layout.dispose(); engine.dispose();
  if (!engine.idle) throw new Error('Electron main engine did not become idle');
  console.log(JSON.stringify({ electronSmoke: 'passed', renderer: rendererResult, seamFrames: seams.length, consoleErrors: errors.length }));
  win.destroy();
  app.quit();
}).catch(error => { console.error(error.stack || error); app.exit(1); });
`);

  const output = run(electron, [join(fixture, 'main.cjs')], fixture, { timeout: 30000, env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' } });
  if (!output.includes('"electronSmoke":"passed"')) throw new Error(`Electron smoke did not report success:\n${output}`);
  console.log('Packed Electron smoke verified: main bounds/layout, renderer DOM, retarget, cancellation, reduced motion, seams, teardown, and clean console.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

