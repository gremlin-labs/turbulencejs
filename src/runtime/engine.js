import { Ticker } from './ticker';
import { Tween } from './tween';
import { Spring } from './spring';
import * as timeline from './timeline';

// The engine owns one ticker and hands out tweens/springs bound to it.
// `reducedMotion` collapses tween durations to zero and snaps springs, so
// every consumer honors accessibility through one switch.

export class Turbulence {
  constructor({ driver, reducedMotion = false } = {}) {
    if (!driver) throw new Error('turbulence: engine requires a driver');
    this.ticker = new Ticker(driver);
    this._reducedMotion = !!reducedMotion;
    this._active = new Set();
  }

  get reducedMotion() {
    return this._reducedMotion;
  }

  set reducedMotion(v) {
    this._reducedMotion = !!v;
  }

  get activeCount() {
    return this._active.size;
  }

  get idle() {
    return this._active.size === 0 && !this.ticker.running;
  }

  tween(opts) {
    const t = new Tween(this.ticker, {
      ...opts,
      duration: this._reducedMotion ? 0 : opts.duration,
      delay: this._reducedMotion ? 0 : opts.delay,
    });
    this._track(t);
    return t.start();
  }

  spring(opts) {
    if (this._reducedMotion) {
      // Snap: zero-duration tween straight to the target.
      return this.tween({ from: opts.from, to: opts.to, duration: 0, onUpdate: opts.onUpdate, onComplete: opts.onComplete, onCancel: opts.onCancel });
    }
    const s = new Spring(this.ticker, opts);
    this._track(s);
    return s.start();
  }

  sequence(factories) {
    return timeline.sequence(factories);
  }

  parallel(factories) {
    return timeline.parallel(factories);
  }

  stagger(items, makePlayable, staggerMs) {
    return timeline.stagger(this.ticker, items, makePlayable, staggerMs);
  }

  // Cancel everything and stop ticking.
  dispose() {
    for (const p of [...this._active]) p.cancel();
    this._active.clear();
  }

  _track(playable) {
    this._active.add(playable);
    playable.finished.then(() => this._active.delete(playable));
  }
}

