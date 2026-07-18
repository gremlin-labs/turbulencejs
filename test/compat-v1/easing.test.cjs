'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolve, cubicBezier, named } = require('../../dist/turbulencejs.cjs');

test('named curves hit endpoints', () => {
  for (const name of Object.keys(named)) {
    const fn = named[name];
    assert.ok(Math.abs(fn(0)) < 1e-6, `${name}(0) ≈ 0, got ${fn(0)}`);
    assert.ok(Math.abs(fn(1) - 1) < 1e-6, `${name}(1) ≈ 1, got ${fn(1)}`);
  }
});

test('cubicBezier matches known CSS ease curve shape', () => {
  const ease = cubicBezier(0.25, 0.1, 0.25, 1);
  // Reference value for CSS `ease` at t=0.5 is ≈ 0.8024
  assert.ok(Math.abs(ease(0.5) - 0.8024) < 0.005, `got ${ease(0.5)}`);
  // Monotonic non-decreasing for a monotonic curve
  let prev = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const v = ease(i / 100);
    assert.ok(v >= prev - 1e-9, `monotonic at ${i / 100}`);
    prev = v;
  }
});

test('resolve accepts function, name, and cubic-bezier() string', () => {
  const fn = (t) => t;
  assert.equal(resolve(fn), fn);
  assert.equal(resolve('linear')(0.3), 0.3);
  const b = resolve('cubic-bezier(0.4, 0, 0.2, 1)');
  assert.ok(Math.abs(b(0.5) - named.smooth(0.5)) < 1e-6);
  assert.equal(resolve(null), named.smooth);
});

test('resolve throws on unknown easing', () => {
  assert.throws(() => resolve('warp-speed'), /unknown easing/);
  assert.throws(() => resolve(42), /easing must be/);
});
