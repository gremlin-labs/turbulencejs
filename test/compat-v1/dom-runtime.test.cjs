'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Turbulence } = require('../../dist/turbulencejs.cjs');
const { manualDriver } = require('../../dist/turbulencejs.cjs');
const { DomAnimator, transformCss } = require('../../dist/dom.cjs');

function makeEngine() {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  const run = (ms, step = 16) => {
    for (let t = 0; t < ms; t += step) driver.step(step);
  };
  return { driver, engine, run };
}

// Minimal fake element: enough style surface for DomAnimator.
function fakeEl() {
  const custom = new Map();
  const style = {
    setProperty: (k, v) => custom.set(k, v),
    getPropertyValue: (k) => custom.get(k) || '',
  };
  return { style, custom };
}

test('transformCss composes translate/scale/rotate', () => {
  assert.equal(transformCss({ x: 0, y: 0, scale: 1, rotate: 0 }), 'none');
  assert.equal(transformCss({ x: 10, y: -4, scale: 1, rotate: 0 }), 'translate3d(10px, -4px, 0)');
  assert.equal(transformCss({ x: 0, y: 0, scale: 1.05, rotate: 0 }), 'scale(1.05)');
  assert.equal(
    transformCss({ x: 5, y: 0, scale: 0.9, rotate: 45 }),
    'translate3d(5px, 0px, 0) scale(0.9) rotate(45deg)'
  );
});

test('animate x/opacity writes transform and opacity through frames', async () => {
  const { engine, run } = makeEngine();
  const anim = new DomAnimator(engine);
  const el = fakeEl();
  const handle = anim.animate(el, { x: 100, opacity: 0.5 }, { duration: 100, easing: 'linear' });
  run(200);
  const result = await handle.finished;
  assert.equal(result.finished, true);
  assert.equal(el.style.transform, 'translate3d(100px, 0px, 0)');
  assert.equal(el.style.opacity, '0.5');
});

test('re-animating mid-flight retargets, no restart jump', () => {
  const { engine, driver } = makeEngine();
  const anim = new DomAnimator(engine);
  const el = fakeEl();
  anim.animate(el, { x: 100 }, { duration: 100, easing: 'linear' });
  driver.step(16);
  driver.step(50); // x = 50
  assert.equal(el.style.transform, 'translate3d(50px, 0px, 0)');
  anim.animate(el, { x: 0 }, { duration: 100, easing: 'linear' });
  driver.step(50); // halfway back → 25
  assert.equal(el.style.transform, 'translate3d(25px, 0px, 0)');
});

test('set() applies immediately and cancels in-flight motion', () => {
  const { engine, driver } = makeEngine();
  const anim = new DomAnimator(engine);
  const el = fakeEl();
  anim.animate(el, { x: 100 }, { duration: 100 });
  driver.step(16);
  anim.set(el, { x: 3, opacity: 0 });
  driver.step(50);
  assert.equal(el.style.transform, 'translate3d(3px, 0px, 0)');
  assert.equal(el.style.opacity, '0');
});

test('CSS custom properties animate with px units', async () => {
  const { engine, run } = makeEngine();
  const anim = new DomAnimator(engine);
  const el = fakeEl();
  el.style.setProperty('--sidebar-width', '48px');
  const handle = anim.animate(el, { '--sidebar-width': '268px' }, { duration: 100, easing: 'linear' });
  run(60);
  const mid = parseFloat(el.custom.get('--sidebar-width'));
  assert.ok(mid > 48 && mid < 268, `mid value ${mid}`);
  run(140);
  await handle.finished;
  assert.equal(el.custom.get('--sidebar-width'), '268px');
});

test('reduced motion jumps DOM animations to the end state', async () => {
  const driver = manualDriver();
  const engine = new Turbulence({ driver, reducedMotion: true });
  const anim = new DomAnimator(engine);
  const el = fakeEl();
  const handle = anim.animate(el, { x: 40, opacity: 0 }, { duration: 400 });
  const result = await handle.finished;
  assert.equal(result.finished, true);
  assert.equal(el.style.transform, 'translate3d(40px, 0px, 0)');
  assert.equal(el.style.opacity, '0');
  assert.equal(engine.idle, true);
});

test('animator disposal cancels owned channels and leaves the engine idle', async () => {
  const { engine, driver } = makeEngine();
  const anim = new DomAnimator(engine);
  const handle = anim.animate(fakeEl(), { x: 100, opacity: 0 }, { duration: 1000 });
  driver.step(16);
  anim.dispose();
  const result = await handle.finished;
  assert.equal(result.cancelled, true);
  assert.equal(engine.idle, true);
  assert.throws(() => anim.animate(fakeEl(), { x: 1 }), /disposed/);
});

test('createEngine removes its reduced-motion listener on dispose', () => {
  const listeners = new Set();
  const previousWindow = global.window;
  global.window = {
    matchMedia: () => ({
      matches: false,
      addEventListener: (_name, listener) => listeners.add(listener),
      removeEventListener: (_name, listener) => listeners.delete(listener),
    }),
  };
  try {
    const { createEngine } = require('../../dist/dom.cjs');
    const engine = createEngine({ driver: manualDriver() });
    assert.equal(listeners.size, 1);
    for (const listener of listeners) listener({ matches: true });
    assert.equal(engine.reducedMotion, true);
    engine.dispose();
    assert.equal(listeners.size, 0);
  } finally {
    global.window = previousWindow;
  }
});
