'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Turbulence } = require('../../dist/turbulencejs.cjs');
const { manualDriver } = require('../../dist/turbulencejs.cjs');

function makeEngine() {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  const run = (ms, step = 16) => {
    for (let t = 0; t < ms; t += step) {
      driver.step(step);
      if (!driver.hasPending) break;
    }
  };
  return { driver, engine, run };
}

test('spring converges to target and completes', async () => {
  const { engine, run } = makeEngine();
  let last = null;
  const s = engine.spring({ from: 0, to: 100, onUpdate: (v) => (last = v), stiffness: 170, damping: 24 });
  run(5000);
  const result = await s.finished;
  assert.equal(result.finished, true);
  assert.equal(last, 100); // snapped exactly to target at rest
  assert.equal(engine.idle, true);
});

test('spring moves toward target monotonically enough early on', () => {
  const { engine, driver } = makeEngine();
  const values = [];
  engine.spring({ from: 0, to: 100, onUpdate: (v) => values.push(v) });
  driver.step(16);
  driver.step(16);
  driver.step(16);
  assert.ok(values[values.length - 1] > 0, 'moved off start');
  assert.ok(values[values.length - 1] < 100, 'not teleported');
});

test('retarget preserves velocity (keeps drifting before turning)', () => {
  const { engine, driver } = makeEngine();
  const values = [];
  const s = engine.spring({ from: 0, to: 100, onUpdate: (v) => values.push(v) });
  driver.step(16);
  for (let i = 0; i < 6; i++) driver.step(16);
  const before = values[values.length - 1];
  assert.ok(before > 5, `should be moving, at ${before}`);
  s.retarget(0);
  driver.step(8);
  const justAfter = values[values.length - 1];
  // With preserved positive velocity the value keeps rising briefly.
  assert.ok(justAfter >= before, `velocity preserved: ${justAfter} >= ${before}`);
});

test('object springs animate all keys', async () => {
  const { engine, run } = makeEngine();
  let last = null;
  const s = engine.spring({ from: { x: 0, width: 100 }, to: { x: 50, width: 300 }, onUpdate: (v) => (last = v) });
  run(5000);
  await s.finished;
  assert.deepEqual(last, { x: 50, width: 300 });
});

test('spring rejects non-numeric keys', () => {
  const { engine } = makeEngine();
  assert.throws(() => engine.spring({ from: { x: 'red' }, to: { x: 'blue' } }), /must be a number/);
});
