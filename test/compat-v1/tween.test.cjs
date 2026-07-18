'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Turbulence } = require('../../dist/turbulencejs.cjs');
const { manualDriver } = require('../../dist/turbulencejs.cjs');

function makeEngine() {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  const run = (ms, step = 16) => {
    for (let t = 0; t < ms; t += step) driver.step(step);
  };
  return { driver, engine, run };
}

test('tween interpolates intermediate values with linear easing', () => {
  const { engine, driver } = makeEngine();
  const values = [];
  engine.tween({ from: 0, to: 100, duration: 100, easing: 'linear', onUpdate: (v) => values.push(v) });
  driver.step(16); // dt 0 → t=0
  driver.step(50); // t=50
  assert.equal(values[values.length - 1], 50);
  driver.step(25); // t=75
  assert.equal(values[values.length - 1], 75);
  driver.step(25); // t=100 → complete
  assert.equal(values[values.length - 1], 100);
});

test('tween completes, resolves finished, and the ticker goes idle', async () => {
  const { engine, driver, run } = makeEngine();
  let completed = null;
  const tw = engine.tween({ from: 0, to: 10, duration: 60, easing: 'linear', onComplete: (v) => (completed = v) });
  run(200);
  const result = await tw.finished;
  assert.deepEqual(result, { finished: true, cancelled: false, value: 10 });
  assert.equal(completed, 10);
  assert.equal(engine.activeCount, 0);
  assert.equal(engine.idle, true);
});

test('retarget restarts from current value — no jump', () => {
  const { engine, driver } = makeEngine();
  const values = [];
  const tw = engine.tween({ from: 0, to: 100, duration: 100, easing: 'linear', onUpdate: (v) => values.push(v) });
  driver.step(16);
  driver.step(50); // at 50
  tw.retarget(0, { duration: 100 });
  const atRetarget = values[values.length - 1];
  assert.equal(atRetarget, 50);
  driver.step(50); // halfway back: 50 → 25
  assert.equal(values[values.length - 1], 25);
  driver.step(50);
  assert.equal(values[values.length - 1], 0);
});

test('cancel stops updates and resolves cancelled', async () => {
  const { engine, driver } = makeEngine();
  const values = [];
  const tw = engine.tween({ from: 0, to: 100, duration: 100, easing: 'linear', onUpdate: (v) => values.push(v) });
  driver.step(16);
  driver.step(30);
  tw.cancel();
  const count = values.length;
  driver.step(50);
  assert.equal(values.length, count);
  const result = await tw.finished;
  assert.equal(result.cancelled, true);
  assert.equal(engine.idle, true);
});

test('delay defers motion', () => {
  const { engine, driver } = makeEngine();
  const values = [];
  engine.tween({ from: 0, to: 10, duration: 100, delay: 100, easing: 'linear', onUpdate: (v) => values.push(v) });
  driver.step(16);
  driver.step(50);
  assert.equal(values.length, 0); // still delayed
  driver.step(50); // delay over (elapsed 100 → t=0)
  driver.step(50);
  assert.equal(values[values.length - 1], 5);
});

test('finish() jumps to end state', async () => {
  const { engine, driver } = makeEngine();
  let last = null;
  const tw = engine.tween({ from: 0, to: 10, duration: 1000, onUpdate: (v) => (last = v) });
  driver.step(16);
  tw.finish();
  assert.equal(last, 10);
  assert.equal((await tw.finished).finished, true);
});

test('pause/resume', () => {
  const { engine, driver } = makeEngine();
  const values = [];
  const tw = engine.tween({ from: 0, to: 100, duration: 100, easing: 'linear', onUpdate: (v) => values.push(v) });
  driver.step(16);
  driver.step(50);
  tw.pause();
  const count = values.length;
  driver.step(50);
  assert.equal(values.length, count);
  tw.resume();
  driver.step(16); // dt 0 re-baseline
  driver.step(50);
  assert.equal(values[values.length - 1], 100);
});

test('tween values can be rects and colors', () => {
  const { engine, driver } = makeEngine();
  let rect = null;
  engine.tween({
    from: { x: 0, y: 0, width: 100, height: 100 },
    to: { x: 100, y: 0, width: 300, height: 100 },
    duration: 100,
    easing: 'linear',
    onUpdate: (v) => (rect = v),
  });
  driver.step(16);
  driver.step(50);
  assert.deepEqual(rect, { x: 50, y: 0, width: 200, height: 100 });
});
