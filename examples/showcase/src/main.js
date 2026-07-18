import turbulencejs from 'turbulencejs';
import cartoon from 'turbulencejs/cartoon';
import cinematic from 'turbulencejs/cinematic';
import { source as surfaceSource } from 'turbulencejs/surfaces';
import { enhance, sidebarReady, snaporate, tetrisLoad } from 'turbulencejs/effects';
import { drag, hover } from 'turbulencejs/interact';
import { createShowcaseInteractions } from './components.js';
import { isReducedMotion, motionProfiles, createMotionRunner } from './motion-profiles.js';
import { renderMockData } from './mock-data.js';

renderMockData(document);

const reducedOverride = new URLSearchParams(window.location.search).get('reduced') === '1';
document.documentElement.dataset.reducedMotion = String(reducedOverride || isReducedMotion(window.matchMedia.bind(window)));

const motionRunner = createMotionRunner(turbulencejs, {
  root: document,
  location: window.location,
  history: window.history,
  dispatchTarget: document,
  packs: { cartoon, cinematic }
});

const interactions = createShowcaseInteractions({
  turbulencejs,
  root: document,
  view: window,
  motionRunner
});
const turbulenceHover = hover('[data-turbulence-lab] .turbulence-fixture', {
  enter: turbulencejs.turb.track({ scale: [1, 1.025], y: [0, -3] }, { duration: 180, easing: 'easeOutCubic' }),
  leave: turbulencejs.turb.track({ scale: [1.025, 1], y: [-3, 0] }, { duration: 150, easing: 'easeOutCubic' }),
  interruption: 'reverse',
  forceHover: true,
  reducedMotion: reducedOverride || undefined,
  onStateChange: (state, session) => {
    document.documentElement.dataset.hoverState = state;
    document.documentElement.dataset.hoverPerformances = String(session.diagnostics.activePerformances);
  }
});
document.documentElement.dataset.hoverState = turbulenceHover.state;
document.documentElement.dataset.hoverPerformances = String(turbulenceHover.diagnostics.activePerformances);
const clientDrag = drag('[data-customer-rows] tr', {
  axis: 'y',
  follow: 'spring',
  strategy: 'original',
  bounds: document.querySelector('.table-scroll'),
  dropZones: '[data-customer-rows] tr',
  keyboardStep: 44,
  magneticDistance: 32,
  reducedMotion: reducedOverride || undefined,
  canDrop: ({ target, zone }) => Boolean(zone && zone !== target),
  onDrop: ({ target, zone }) => {
    const rows = [...target.parentElement.children];
    if (rows.indexOf(target) < rows.indexOf(zone)) zone.after(target);
    else zone.before(target);
    document.documentElement.dataset.dragCommits = String(Number(document.documentElement.dataset.dragCommits || 0) + 1);
  },
  announce: ({ type, target, zone }) => {
    const names = { pickup: 'Picked up', move: 'Moving', committed: 'Moved', rejected: 'Cannot move there', cancelled: 'Move cancelled' };
    const destination = zone?.dataset.customer ? ` near ${zone.dataset.customer}` : '';
    const announcer = document.querySelector('[data-drag-announcer]');
    if (announcer) announcer.textContent = `${names[type] || 'Updated'} ${target.dataset.customer}${destination}.`;
  },
  onDragStateChange: (state, session) => {
    document.documentElement.dataset.dragState = state;
    document.documentElement.dataset.dragActive = String(session.diagnostics.activeTarget);
  }
});
document.documentElement.dataset.dragState = clientDrag.state;
document.documentElement.dataset.dragActive = '0';
document.documentElement.dataset.dragCommits = '0';

const turbulenceControllers = new Set();

function createSnapFixture(width = 64, height = 40) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      pixels.set(x < width / 2 ? [183, 243, 74, 255] : [95, 76, 255, 255], offset);
    }
  }
  return new ImageData(pixels, width, height);
}

function stageDataUrl(size, color, label) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.max(1, Math.round(size * 0.625));
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#11140f';
  context.font = `bold ${Math.max(3, size / 7)}px sans-serif`;
  context.fillText(label, size * 0.08, canvas.height * 0.58);
  return canvas.toDataURL('image/png');
}

const snapFixtureSource = surfaceSource.imageData(createSnapFixture());
const enhanceStages = [
  { src: stageDataUrl(8, '#b7f34a', '8'), resolution: 8 },
  { src: stageDataUrl(48, '#72ddc3', '48'), resolution: 48 },
  { src: stageDataUrl(320, '#f1bf4f', 'FINAL'), resolution: 320 }
];

function turbulenceDiagnostics(performance, message) {
  const output = document.querySelector('[data-turbulence-diagnostics]');
  const status = document.querySelector('[data-turbulence-status]');
  if (output) output.textContent = performance
    ? `${message} · units ${performance.diagnostics.unitCount} · resources ${performance.diagnostics.resourceCount}`
    : message;
  if (status) status.textContent = turbulenceControllers.size > 0 ? 'Trading' : 'Ready';
}

function ownTurbulence(performance, label) {
  turbulenceControllers.add(performance);
  turbulenceDiagnostics(performance, label);
  return performance;
}

function settleTurbulence(performance, message) {
  turbulenceControllers.delete(performance);
  turbulenceDiagnostics(null, message);
}

function runSnap(mode) {
  const target = document.querySelector('[data-snap-fixture]');
  turbulenceControllers.forEach(controller => controller.stop());
  turbulenceControllers.clear();
  target.style.visibility = mode === 'in' ? 'hidden' : 'visible';
  let performance;
  const fidelity = document.querySelector('[data-turbulence-fidelity]').value;
  const seed = document.querySelector('[data-turbulence-seed]').value;
  performance = turbulencejs.script(snaporate[mode](snapFixtureSource, {
    fidelity, direction: mode === 'out' ? 'up-right' : 'left',
    turbulence: 0.32, duration: 900
  })).play(target, {
    seed,
    reducedMotion: reducedOverride || undefined,
    onComplete: () => settleTurbulence(performance, `Snaporate ${mode} settled · resources 0`),
    onCancel: () => settleTurbulence(performance, 'Snaporate interrupted · resources 0')
  });
  document.querySelector('[data-turbulence-code] code').textContent = `snaporate.${mode}(source, { fidelity: '${fidelity}', direction: '${mode === 'out' ? 'up-right' : 'left'}' })`;
  ownTurbulence(performance, `Snaporate ${mode} · ${performance.diagnostics.selectedRenderer || 'canvas'}`);
}

function runSidebarReady() {
  turbulenceControllers.forEach(controller => controller.stop());
  turbulenceControllers.clear();
  const parent = document.querySelector('[data-sidebar]');
  const items = [...parent.querySelectorAll('.primary-nav .nav-item')].map(target => ({ target, slots: { parent } }));
  const finish = document.querySelector('[data-sidebar-variant]').value;
  const seed = document.querySelector('[data-turbulence-seed]').value;
  let performance;
  performance = turbulencejs.script(sidebarReady({ finish, parentSlot: 'parent', order: finish === 'mixed' ? 'shuffle' : 'stable', seed }))
    .play(items, {
      autoplay: false, seed,
      reducedMotion: reducedOverride || undefined,
      onComplete: () => settleTurbulence(performance, `Sidebar Ready ${finish} settled`),
      onCancel: () => settleTurbulence(performance, 'Sidebar Ready interrupted · resources 0')
    });
  performance.on('mark', event => turbulenceDiagnostics(performance, `Host mark ${event.name}`));
  document.querySelector('[data-turbulence-code] code').textContent = `sidebarReady({ finish: '${finish}', order: '${finish === 'mixed' ? 'shuffle' : 'stable'}', seed: '${seed}' })`;
  ownTurbulence(performance, `Sidebar Ready · ${finish}`);
  performance.play();
}

function runTetris() {
  turbulenceControllers.forEach(controller => controller.stop());
  turbulenceControllers.clear();
  const group = document.querySelector('[data-tetris-group]');
  const records = [...group.querySelectorAll('[data-tetris-card]')].map(target => {
    const content = target.querySelector('[data-tetris-content]');
    content.style.opacity = '0';
    return { target, slots: { group, block: target.querySelector('[data-tetris-block]'), content } };
  });
  const win = document.querySelector('[data-tetris-variant]').value;
  const seed = document.querySelector('[data-turbulence-seed]').value;
  let performance;
  performance = turbulencejs.script(tetrisLoad({
    blockSlot: 'block', groupSlot: 'group', contentSlot: 'content', win,
    content: 'replace-at-mark', stagger: 90, seed
  })).play(records, {
    autoplay: false, seed,
    reducedMotion: reducedOverride || undefined,
    onComplete: () => settleTurbulence(performance, `Tetris ${win} settled`),
    onCancel: () => settleTurbulence(performance, 'Tetris interrupted · resources 0')
  });
  performance.on('mark', event => turbulenceDiagnostics(performance, `Host mark ${event.name}`));
  document.querySelector('[data-turbulence-code] code').textContent = `tetrisLoad({ win: '${win}', content: 'replace-at-mark', seed: '${seed}' })`;
  ownTurbulence(performance, `Tetris Load · ${win}`);
  performance.play();
}

function runEnhance(proveRetry = false) {
  const target = document.querySelector('[data-enhance-fixture]');
  turbulenceControllers.forEach(controller => controller.stop());
  turbulenceControllers.clear();
  const stages = proveRetry ? [{ src: '/missing-turbulencejs-preview.png', resolution: 4 }, ...enhanceStages] : enhanceStages;
  let performance;
  performance = turbulencejs.script(enhance(stages, {
    duration: 1300, retries: proveRetry ? 1 : 0, retryDelay: 100,
    content: 'replace-at-mark', markName: 'enhance:final',
    onStageError: ({ index }) => turbulenceDiagnostics(performance, `Stage ${index + 1} failed safely; preview retained`)
  })).play(target, {
    autoplay: false,
    reducedMotion: reducedOverride || undefined,
    onComplete: () => settleTurbulence(performance, 'Enhance settled · semantic content retained'),
    onCancel: () => settleTurbulence(performance, 'Enhance interrupted · resources 0')
  });
  performance.on('mark', event => turbulenceDiagnostics(performance, `Host mark ${event.name}`));
  ownTurbulence(performance, proveRetry ? 'Enhance retry path' : 'Enhance progressive stages');
  performance.play();
}

function onTurbulenceClick(event) {
  const action = event.target.closest('[data-turbulence]')?.dataset.turbulence;
  if (action === 'snap-out') runSnap('out');
  if (action === 'snap-in') runSnap('in');
  if (action === 'enhance') runEnhance(false);
  if (action === 'enhance-retry') runEnhance(true);
  if (action === 'sidebar-ready') runSidebarReady();
  if (action === 'tetris') runTetris();
}

document.addEventListener('click', onTurbulenceClick);
const turbulenceLab = Object.freeze({ runSnap, runEnhance, runSidebarReady, runTetris, active: turbulenceControllers });
window.turbulencejsLab = Object.freeze({ motion: motionRunner, interactions, turbulence: turbulenceLab, hover: turbulenceHover, drag: clientDrag });

let longTaskObserver = null;
if ('PerformanceObserver' in window) {
  let longTaskCount = 0;
  let longestTask = 0;
  longTaskObserver = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      longTaskCount += 1;
      longestTask = Math.max(longestTask, entry.duration);
    });
    document.documentElement.dataset.longTasks = String(longTaskCount);
    document.documentElement.dataset.longestTaskMs = longestTask.toFixed(1);
  });
  try {
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    longTaskObserver = null;
  }
}
document.documentElement.dataset.longTasks = '0';
document.documentElement.dataset.longestTaskMs = '0.0';

function titleCase(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase());
}

function syncMotionControls() {
  const state = motionRunner.getState();
  const profile = motionProfiles[state.profile];
  document.querySelectorAll('[data-profile]').forEach(button => {
    button.setAttribute('aria-checked', String(button.dataset.profile === state.profile));
  });
  document.querySelectorAll('[data-intensity]').forEach(button => {
    const active = button.dataset.intensity === state.intensity;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-profile-label]').forEach(label => {
    label.textContent = `${profile.label} · ${titleCase(state.intensity)}`;
  });
  document.querySelectorAll('[data-choreography-code]').forEach(code => {
    code.textContent = profile.code;
  });
}

function syncReducedMotion() {
  const reduced = reducedOverride || isReducedMotion(window.matchMedia.bind(window));
  document.documentElement.dataset.reducedMotion = String(reduced);
  document.querySelectorAll('[data-reduced-status]').forEach(status => {
    status.innerHTML = `<i></i> ${reduced ? 'Reduced motion' : 'Full motion'}`;
  });
}

function trackNavigation() {
  const links = Array.from(document.querySelectorAll('.primary-nav a[href^="#"]'));
  const sections = links.map(link => document.querySelector(link.hash)).filter(Boolean);
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach(link => {
      const active = link.hash === `#${visible.target.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-20% 0px -65%', threshold: [0, 0.25, 0.6] });
  sections.forEach(section => observer.observe(section));
}

document.addEventListener('turbulencejs:profilechange', syncMotionControls);
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', syncReducedMotion);
window.addEventListener('beforeunload', () => {
  longTaskObserver?.disconnect();
  motionRunner.stop();
  interactions.destroy();
  turbulenceHover.destroy();
  clientDrag.destroy();
  document.removeEventListener('click', onTurbulenceClick);
  turbulenceControllers.forEach(controller => controller.stop());
  turbulenceControllers.clear();
}, { once: true });

syncMotionControls();
syncReducedMotion();
trackNavigation();
window.requestAnimationFrame(() => motionRunner.run());
