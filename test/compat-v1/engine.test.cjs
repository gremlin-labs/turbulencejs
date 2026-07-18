'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Turbulence } = require('../../dist/turbulencejs.cjs');
const { manualDriver } = require('../../dist/turbulencejs.cjs');

test('reducedMotion collapses tweens to an immediate jump', async () => {
  const driver = manualDriver();
  const engine = new Turbulence({ driver, reducedMotion: true });
  const values = [];
  const tw = engine.tween({ from: 0, to: 100, duration: 500, onUpdate: (v) => values.push(v) });
  // No driver stepping at all — completes synchronously on start.
  assert.deepEqual(values, [100]);
  assert.equal((await tw.finished).finished, true);
  assert.equal(engine.idle, true);
});

test('reducedMotion snaps springs too', async () => {
  const driver = manualDriver();
  const engine = new Turbulence({ driver, reducedMotion: true });
  let last = null;
  const s = engine.spring({ from: { x: 0 }, to: { x: 42 }, onUpdate: (v) => (last = v) });
  assert.deepEqual(last, { x: 42 });
  assert.equal((await s.finished).finished, true);
});

test('dispose cancels all active playables and goes idle', async () => {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  const a = engine.tween({ from: 0, to: 1, duration: 1000 });
  const b = engine.spring({ from: 0, to: 1 });
  assert.equal(engine.activeCount, 2);
  engine.dispose();
  assert.equal((await a.finished).cancelled, true);
  assert.equal((await b.finished).cancelled, true);
  assert.equal(engine.activeCount, 0);
});

test('engine requires a driver', () => {
  assert.throws(() => new Turbulence(), /requires a driver/);
});

test('ticker stops when all animations finish (no idle timers)', () => {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  engine.tween({ from: 0, to: 10, duration: 30, easing: 'linear' });
  assert.equal(engine.ticker.running, true);
  driver.step(16);
  driver.step(16);
  driver.step(16); // past 30ms → complete
  assert.equal(engine.ticker.running, false);
  assert.equal(driver.hasPending, false);
});
