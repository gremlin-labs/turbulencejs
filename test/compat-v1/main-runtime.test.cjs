'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Turbulence } = require('../../dist/turbulencejs.cjs');
const { manualDriver } = require('../../dist/turbulencejs.cjs');
const { BoundsAnimator, Layout } = require('../../dist/main.cjs');

function makeEngine() {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  const run = (ms, step = 16) => {
    for (let t = 0; t < ms; t += step) driver.step(step);
  };
  return { driver, engine, run };
}

function fakeView(bounds = { x: 0, y: 0, width: 100, height: 100 }) {
  const calls = [];
  return {
    calls,
    destroyed: false,
    isDestroyed() {
      return this.destroyed;
    },
    getBounds() {
      return { ...bounds };
    },
    setBounds(b) {
      if (this.destroyed) throw new Error('destroyed');
      bounds = b;
      calls.push(b);
    },
  };
}

test('BoundsAnimator interpolates bounds with integer, flush rects', async () => {
  const { engine, run } = makeEngine();
  const ba = new BoundsAnimator(engine);
  const view = fakeView({ x: 0, y: 0, width: 100, height: 100 });
  const tw = ba.animate(view, { x: 50, y: 0, width: 300, height: 100 }, { duration: 100, easing: 'linear' });
  run(200);
  const result = await tw.finished;
  assert.equal(result.finished, true);
  assert.ok(view.calls.length >= 5, `intermediate frames: ${view.calls.length}`);
  // Monotonic x progression, all integers.
  let prev = -1;
  for (const b of view.calls) {
    assert.ok(Number.isInteger(b.x) && Number.isInteger(b.width), 'integer bounds');
    assert.ok(b.x >= prev, 'monotonic');
    prev = b.x;
  }
  assert.deepEqual(view.calls[view.calls.length - 1], { x: 50, y: 0, width: 300, height: 100 });
});

test('animate() while animating retargets the same tween', () => {
  const { engine, driver } = makeEngine();
  const ba = new BoundsAnimator(engine);
  const view = fakeView();
  const t1 = ba.animate(view, { x: 100, y: 0, width: 100, height: 100 }, { duration: 100 });
  driver.step(16);
  driver.step(30);
  const t2 = ba.animate(view, { x: 0, y: 0, width: 100, height: 100 }, { duration: 100 });
  assert.equal(t1, t2, 'same tween retargeted');
  assert.equal(ba.isAnimating(view), true);
});

test('set() cancels in-flight animation and places immediately', async () => {
  const { engine, driver } = makeEngine();
  const ba = new BoundsAnimator(engine);
  const view = fakeView();
  const tw = ba.animate(view, { x: 100, y: 0, width: 100, height: 100 }, { duration: 100 });
  driver.step(16);
  ba.set(view, { x: 7, y: 7, width: 7, height: 7 });
  assert.equal((await tw.finished).cancelled, true);
  assert.deepEqual(view.calls[view.calls.length - 1], { x: 7, y: 7, width: 7, height: 7 });
  assert.equal(ba.isAnimating(view), false);
});

test('destroyed target cancels cleanly without throwing', async () => {
  const { engine, driver } = makeEngine();
  const ba = new BoundsAnimator(engine);
  const view = fakeView();
  const tw = ba.animate(view, { x: 100, y: 0, width: 100, height: 100 }, { duration: 100 });
  driver.step(16);
  driver.step(16);
  view.destroyed = true;
  driver.step(16);
  const result = await tw.finished;
  assert.equal(result.cancelled, true);
  assert.equal(engine.idle, true);
});

test('Layout computes, applies, and animates regions on one clock', async () => {
  const { engine, driver, run } = makeEngine();
  const compute = (state) => ({
    sidebar: { x: 0, y: 0, width: state.sidebar, height: 600 },
    content: { x: state.sidebar, y: 0, width: 800 - state.sidebar, height: 600 },
  });
  const layout = new Layout(engine, compute);
  const applied = { sidebar: [], content: [] };
  layout.onRegion('sidebar', (r) => applied.sidebar.push(r));
  layout.onRegion('content', (r) => applied.content.push(r));

  layout.set({ sidebar: 48 });
  assert.deepEqual(layout.get('content'), { x: 48, y: 0, width: 752, height: 600 });
  assert.equal(applied.content.length, 1);

  layout.animateTo({ sidebar: 268 }, { duration: 100, easing: 'linear' });
  run(200);
  const lastSidebar = applied.sidebar[applied.sidebar.length - 1];
  const lastContent = applied.content[applied.content.length - 1];
  assert.deepEqual(lastSidebar, { x: 0, y: 0, width: 268, height: 600 });
  assert.deepEqual(lastContent, { x: 268, y: 0, width: 532, height: 600 });
  assert.ok(applied.content.length > 3, 'content animated through frames');

  // Regions stay flush at every animated frame (sidebar.right == content.left).
  for (let i = 0; i < applied.sidebar.length; i++) {
    const s = applied.sidebar[i];
    const c = applied.content[i];
    assert.equal(s.x + s.width, c.x, `flush at frame ${i}`);
  }
});

test('Layout.animateTo mid-flight retargets smoothly', () => {
  const { engine, driver } = makeEngine();
  const compute = (state) => ({ box: { x: state.x, y: 0, width: 10, height: 10 } });
  const layout = new Layout(engine, compute);
  const xs = [];
  layout.onRegion('box', (r) => xs.push(r.x));
  layout.set({ x: 0 });
  const t1 = layout.animateTo({ x: 100 }, { duration: 100, easing: 'linear' });
  driver.step(16);
  driver.step(50);
  const t2 = layout.animateTo({ x: 0 }, { duration: 100, easing: 'linear' });
  assert.equal(t1, t2);
  const peak = xs[xs.length - 1];
  driver.step(50);
  assert.ok(xs[xs.length - 1] < peak, 'turned back toward 0');
});

test('a throwing applier does not break other appliers', () => {
  const { engine } = makeEngine();
  const layout = new Layout(engine, () => ({ a: { x: 0, y: 0, width: 1, height: 1 }, b: { x: 1, y: 0, width: 1, height: 1 } }));
  const seen = [];
  const origError = console.error;
  console.error = () => {};
  try {
    layout.onRegion('a', () => {
      throw new Error('bad applier');
    });
    layout.onRegion('b', (r) => seen.push(r));
    layout.set({});
    assert.equal(seen.length, 1);
  } finally {
    console.error = origError;
  }
});

test('region subscriptions can unsubscribe and layout disposal cancels work', async () => {
  const { engine, driver } = makeEngine();
  const layout = new Layout(engine, state => ({ box: { x: state.x, y: 0, width: 10, height: 10 } }));
  const seen = [];
  const unsubscribe = layout.onRegion('box', rect => seen.push(rect.x));
  layout.set({ x: 0 });
  assert.equal(unsubscribe(), true);
  layout.set({ x: 10 });
  assert.deepEqual(seen, [0]);
  const tween = layout.animateTo({ x: 100 }, { duration: 1000 });
  driver.step(16);
  layout.dispose();
  assert.equal((await tween.finished).cancelled, true);
  assert.equal(engine.idle, true);
  assert.throws(() => layout.set({ x: 1 }), /disposed/);
});

test('BoundsAnimator cancelAll and dispose own every target tween', async () => {
  const { engine, driver } = makeEngine();
  const animator = new BoundsAnimator(engine);
  const first = animator.animate(fakeView(), { x: 10, y: 0, width: 100, height: 100 }, { duration: 1000 });
  const second = animator.animate(fakeView(), { x: 20, y: 0, width: 100, height: 100 }, { duration: 1000 });
  driver.step(16);
  animator.cancelAll();
  assert.equal((await first.finished).cancelled, true);
  assert.equal((await second.finished).cancelled, true);
  assert.equal(engine.idle, true);
  animator.dispose();
  assert.throws(() => animator.animate(fakeView(), { x: 1, y: 0, width: 1, height: 1 }), /disposed/);
});

test('destroyed target before animation resolves immediately without scheduling', async () => {
  const { engine } = makeEngine();
  const animator = new BoundsAnimator(engine);
  const view = fakeView();
  view.destroyed = true;
  view.getBounds = () => { throw new Error('destroyed'); };
  const result = await animator.animate(view, { x: 1, y: 1, width: 1, height: 1 }).finished;
  assert.equal(result.finished, true);
  assert.equal(engine.idle, true);
});

test('main timer engine unrefs scheduled work and can be disposed', () => {
  const { createEngine } = require('../../dist/main.cjs');
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  let unrefs = 0;
  let clears = 0;
  global.setTimeout = () => ({ unref: () => { unrefs++; } });
  global.clearTimeout = () => { clears++; };
  try {
    const engine = createEngine({ fps: 60 });
    engine.tween({ from: 0, to: 1, duration: 100 });
    assert.equal(unrefs, 1);
    engine.dispose();
    assert.equal(clears, 1);
    assert.equal(engine.idle, true);
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});
