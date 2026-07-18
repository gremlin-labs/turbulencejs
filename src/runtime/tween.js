import { resolve } from './easing';
import { interpolate } from './interpolate';

// A Tween drives one value from `from` to `to` over `duration` ms on a ticker.
// It is interruptible (cancel), retargetable (retarget keeps motion continuous
// by restarting from the current value), and awaitable (`finished` resolves
// with { finished, cancelled } — it never rejects).

let nextId = 1;

export class Tween {
  constructor(ticker, opts) {
    const {
      from,
      to,
      duration = 300,
      delay = 0,
      easing = 'smooth',
      onUpdate,
      onComplete,
      onCancel,
    } = opts;
    if (from === undefined || to === undefined) {
      throw new Error('turbulence: tween requires `from` and `to`');
    }
    this.id = `tween-${nextId++}`;
    this._ticker = ticker;
    this._duration = Math.max(0, duration);
    this._delay = Math.max(0, delay);
    this._ease = resolve(easing);
    this._onUpdate = onUpdate || null;
    this._onComplete = onComplete || null;
    this._onCancel = onCancel || null;

    this._from = from;
    this._to = to;
    this._fn = interpolate(from, to);
    this._value = from;
    this._elapsed = -this._delay;
    this._playing = false;
    this._done = false;
    this._tick = this._tick.bind(this);

    this.finished = new Promise((res) => {
      this._settle = res;
    });
  }

  get value() {
    return this._value;
  }

  get playing() {
    return this._playing;
  }

  get progress() {
    if (this._duration === 0) return this._done ? 1 : 0;
    return Math.max(0, Math.min(1, this._elapsed / this._duration));
  }

  get target() {
    return this._to;
  }

  start() {
    if (this._playing || this._done) return this;
    this._playing = true;
    if (this._duration === 0 && this._delay === 0) {
      // Zero-duration (e.g. reduced motion): apply end state on start.
      this._value = this._fn(1);
      this._emitUpdate();
      this._complete();
      return this;
    }
    this._remove = this._ticker.add(this._tick);
    return this;
  }

  // Redirect toward a new target mid-flight; motion restarts from the current
  // value so there is no visual jump. Optionally override duration/easing.
  retarget(to, opts = {}) {
    if (this._done) return this;
    this._from = this._value;
    this._to = to;
    this._fn = interpolate(this._from, to);
    this._elapsed = 0;
    if (opts.duration !== undefined) this._duration = Math.max(0, opts.duration);
    if (opts.easing !== undefined) this._ease = resolve(opts.easing);
    if (!this._playing) this.start();
    return this;
  }

  pause() {
    if (this._playing && this._remove) {
      this._remove();
      this._remove = null;
      this._playing = false;
    }
    return this;
  }

  resume() {
    if (!this._playing && !this._done) {
      this._playing = true;
      this._remove = this._ticker.add(this._tick);
    }
    return this;
  }

  // Jump to the end state and complete.
  finish() {
    if (this._done) return this;
    this._value = this._fn(1);
    this._emitUpdate();
    this._complete();
    return this;
  }

  cancel() {
    if (this._done) return this;
    this._teardown();
    this._done = true;
    if (this._onCancel) this._onCancel(this._value);
    this._settle({ finished: false, cancelled: true, value: this._value });
    return this;
  }

  _tick(dt) {
    this._elapsed += dt;
    if (this._elapsed < 0) return; // still in delay
    const t = this._duration === 0 ? 1 : Math.min(1, this._elapsed / this._duration);
    this._value = this._fn(this._ease(t));
    this._emitUpdate();
    if (t >= 1) this._complete();
  }

  _emitUpdate() {
    if (this._onUpdate) this._onUpdate(this._value, this);
  }

  _complete() {
    this._teardown();
    this._done = true;
    if (this._onComplete) this._onComplete(this._value);
    this._settle({ finished: true, cancelled: false, value: this._value });
  }

  _teardown() {
    if (this._remove) {
      this._remove();
      this._remove = null;
    }
    this._playing = false;
  }
}

