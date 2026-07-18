'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Turbulence } = require('../../dist/turbulencejs.cjs');
const { manualDriver } = require('../../dist/turbulencejs.cjs');

function makeEngine() {
  const driver = manualDriver();
  const engine = new Turbulence({ driver });
  return { driver, engine };
}

test('sequence runs steps in order', async () => {
  const { engine, driver } = makeEngine();
  const order = [];
  const seq = engine.sequence([
    () => engine.tween({ from: 0, to: 1, duration: 20, easing: 'linear', onComplete: () => order.push('a') }),
    () => engine.tween({ from: 0, to: 1, duration: 20, easing: 'linear', onComplete: () => order.push('b') }),
  ]);
  // Drive with async gaps so the sequence's await advances between frames.
  for (let i = 0; i < 10; i++) {
    driver.step(16);
    await Promise.resolve();
    await Promise.resolve();
  }
  const result = await seq.finished;
  assert.deepEqual(order, ['a', 'b']);
  assert.equal(result.finished, true);
});

test('sequence cancel stops mid-flight and skips the rest', async () => {
  const { engine, driver } = makeEngine();
  const order = [];
  let second = false;
  const seq = engine.sequence([
    () => engine.tween({ from: 0, to: 1, duration: 100, onComplete: () => order.push('a') }),
    () => {
      second = true;
      return engine.tween({ from: 0, to: 1, duration: 100 });
    },
  ]);
  driver.step(16);
  await Promise.resolve();
  seq.cancel();
  const result = await seq.finished;
  assert.equal(result.cancelled, true);
  assert.equal(second, false);
  assert.deepEqual(order, []);
});

test('parallel finishes when all finish', async () => {
  const { engine, driver } = makeEngine();
  let done = 0;
  const par = engine.parallel([
    () => engine.tween({ from: 0, to: 1, duration: 20, easing: 'linear', onComplete: () => done++ }),
    () => engine.tween({ from: 0, to: 1, duration: 40, easing: 'linear', onComplete: () => done++ }),
  ]);
  for (let i = 0; i < 6; i++) driver.step(16);
  const result = await par.finished;
  assert.equal(done, 2);
  assert.equal(result.finished, true);
});

test('stagger starts items with spacing on the ticker clock', async () => {
  const { engine, driver } = makeEngine();
  const starts = [];
  const st = engine.stagger(
    ['a', 'b', 'c'],
    (item) => {
      starts.push([item, driver.now]);
      return engine.tween({ from: 0, to: 1, duration: 10, easing: 'linear' });
    },
    50
  );
  assert.equal(starts.length, 1); // first starts immediately
  driver.step(16); // priming frame, dt=0 → elapsed 0
  driver.step(16); // elapsed 16
  driver.step(16); // elapsed 32
  driver.step(16); // elapsed 48
  assert.equal(starts.length, 1);
  driver.step(16); // elapsed 64 ≥ 50 → second starts
  assert.equal(starts.length, 2);
  for (let i = 0; i < 6; i++) driver.step(16); // → third + finish tweens
  await Promise.resolve();
  assert.equal(starts.length, 3);
  const result = await st.finished;
  assert.equal(result.finished, true);
});

test('stagger cancel cancels started players and stops new starts', async () => {
  const { engine, driver } = makeEngine();
  let started = 0;
  const st = engine.stagger(
    [1, 2, 3],
    () => {
      started++;
      return engine.tween({ from: 0, to: 1, duration: 100 });
    },
    30
  );
  driver.step(16);
  st.cancel();
  driver.step(64);
  driver.step(64);
  assert.equal(started, 1);
  const result = await st.finished;
  assert.equal(result.cancelled, true);
  assert.equal(engine.activeCount, 0);
});
