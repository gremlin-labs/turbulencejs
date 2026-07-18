'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Ticker, manualDriver, MAX_DT } = require('../../dist/turbulencejs.cjs');

test('ticker starts on first subscriber, stops on last removal', () => {
  const driver = manualDriver();
  const ticker = new Ticker(driver);
  assert.equal(ticker.running, false);

  const seen = [];
  const remove = ticker.add((dt, now) => seen.push([dt, now]));
  assert.equal(ticker.running, true);

  driver.step(16);
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], [0, 16]); // first frame has dt 0

  driver.step(16);
  assert.deepEqual(seen[1], [16, 32]);

  remove();
  assert.equal(ticker.running, false);
  assert.equal(driver.hasPending, false);
});

test('dt is clamped to MAX_DT after a stall', () => {
  const driver = manualDriver();
  const ticker = new Ticker(driver);
  const dts = [];
  ticker.add((dt) => dts.push(dt));
  driver.step(16);
  driver.step(500); // long stall
  assert.equal(dts[1], MAX_DT);
});

test('a throwing callback is removed and others keep running', () => {
  const driver = manualDriver();
  const ticker = new Ticker(driver);
  const errors = [];
  const origError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    let good = 0;
    ticker.add(() => {
      throw new Error('boom');
    });
    ticker.add(() => good++);
    driver.step(16);
    driver.step(16);
    assert.equal(good, 2);
    assert.equal(ticker.size, 1); // bad one removed
    assert.equal(errors.length, 1);
  } finally {
    console.error = origError;
  }
});
