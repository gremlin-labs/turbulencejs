'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { interpolate, roundRect, parseColor, formatColor } = require('../../dist/turbulencejs.cjs');

test('numbers lerp', () => {
  const fn = interpolate(0, 10);
  assert.equal(fn(0), 0);
  assert.equal(fn(0.5), 5);
  assert.equal(fn(1), 10);
});

test('hex colors interpolate in rgb space', () => {
  const fn = interpolate('#000000', '#ffffff');
  assert.equal(fn(0), 'rgb(0, 0, 0)');
  assert.equal(fn(1), 'rgb(255, 255, 255)');
  assert.equal(fn(0.5), 'rgb(128, 128, 128)');
});

test('rgba and alpha interpolate', () => {
  const fn = interpolate('rgba(0, 0, 0, 0)', 'rgba(255, 0, 0, 1)');
  assert.equal(fn(0.5), 'rgba(128, 0, 0, 0.5)');
});

test('short hex, alpha hex, hsl, transparent parse', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('#ff000080').slice(0, 3), [255, 0, 0]);
  assert.ok(Math.abs(parseColor('#ff000080')[3] - 0.502) < 0.01);
  assert.deepEqual(parseColor('transparent'), [0, 0, 0, 0]);
  const red = parseColor('hsl(0, 100%, 50%)');
  assert.deepEqual(red.map(Math.round), [255, 0, 0, 1]);
  assert.equal(parseColor('not-a-color'), null);
  assert.equal(formatColor([255, 0, 0, 1]), 'rgb(255, 0, 0)');
});

test('unit strings with matching units interpolate', () => {
  const fn = interpolate('0px', '100px');
  assert.equal(fn(0.5), '50px');
  const pct = interpolate('10%', '20%');
  assert.equal(pct(0.5), '15%');
});

test('mismatched unit strings fall back to step', () => {
  const fn = interpolate('10px', '50%');
  assert.equal(fn(0.5), '10px');
  assert.equal(fn(1), '50%');
});

test('rects interpolate and roundRect keeps shared edges flush', () => {
  const fn = interpolate({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 10, width: 200, height: 300 });
  const mid = fn(0.5);
  assert.deepEqual(mid, { x: 25, y: 5, width: 150, height: 200 });

  // Two rects sharing an edge stay flush after rounding at any t.
  const left = interpolate({ x: 0, y: 0, width: 100.3, height: 50 }, { x: 0, y: 0, width: 217.7, height: 50 });
  for (const t of [0, 0.21, 0.5, 0.77, 1]) {
    const l = roundRect(left(t));
    const right = roundRect({ x: left(t).x + left(t).width, y: 0, width: 80.4, height: 50 });
    assert.equal(l.x + l.width, right.x, `flush at t=${t}`);
  }
});

test('arrays and objects interpolate element/key-wise', () => {
  const arr = interpolate([0, 10], [10, 20]);
  assert.deepEqual(arr(0.5), [5, 15]);
  const obj = interpolate({ a: 0, b: '0px' }, { a: 1, b: '10px' });
  assert.deepEqual(obj(0.5), { a: 0.5, b: '5px' });
});

test('unhandled pairs step at t=1', () => {
  const fn = interpolate(true, false);
  assert.equal(fn(0.99), true);
  assert.equal(fn(1), false);
});
