// Damped spring for natural, interruptible motion. Works on numbers or flat
// objects of numbers (e.g. rects, {x, y}). Retargeting preserves velocity so
// direction changes feel physical instead of restarting.

const DEFAULTS = {
  stiffness: 170,
  damping: 24,
  mass: 1,
  restDelta: 0.05, // units — tuned for px-scale values
  restSpeed: 2, // units per second
};

const SUBSTEP = 8; // ms — integrate in small fixed steps for stability

export class Spring {
  constructor(ticker, opts) {
    const { from, to, onUpdate, onComplete, onCancel } = opts;
    if (from === undefined || to === undefined) {
      throw new Error('turbulence: spring requires `from` and `to`');
    }
    this._ticker = ticker;
    this._cfg = { ...DEFAULTS, ...opts };
    this._onUpdate = onUpdate || null;
    this._onComplete = onComplete || null;
    this._onCancel = onCancel || null;

    this._scalar = typeof from === 'number';
    this._keys = this._scalar ? null : Object.keys(to);
    this._pos = this._toVec(from);
    this._target = this._toVec(to);
    this._vel = this._pos.map(() => 0);
    this._playing = false;
    this._done = false;
    this._tick = this._tick.bind(this);
    this.finished = new Promise((res) => {
      this._settle = res;
    });
  }

  _toVec(v) {
    if (this._scalar) return [v];
    return this._keys.map((k) => {
      const n = v[k];
      if (typeof n !== 'number') throw new Error(`turbulence: spring key "${k}" must be a number`);
      return n;
    });
  }

  _fromVec(vec) {
    if (this._scalar) return vec[0];
    const out = {};
    this._keys.forEach((k, i) => {
      out[k] = vec[i];
    });
    return out;
  }

  get value() {
    return this._fromVec(this._pos);
  }

  get playing() {
    return this._playing;
  }

  start() {
    if (this._playing || this._done) return this;
    this._playing = true;
    this._remove = this._ticker.add(this._tick);
    return this;
  }

  retarget(to) {
    if (this._done) return this;
    this._target = this._toVec(to);
    if (!this._playing) this.start();
    return this;
  }

  cancel() {
    if (this._done) return this;
    this._teardown();
    this._done = true;
    if (this._onCancel) this._onCancel(this.value);
    this._settle({ finished: false, cancelled: true, value: this.value });
    return this;
  }

  finish() {
    if (this._done) return this;
    this._pos = [...this._target];
    this._vel = this._vel.map(() => 0);
    if (this._onUpdate) this._onUpdate(this.value, this);
    this._complete();
    return this;
  }

  _tick(dt) {
    const { stiffness, damping, mass } = this._cfg;
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(SUBSTEP, remaining) / 1000; // seconds
      remaining -= SUBSTEP;
      for (let i = 0; i < this._pos.length; i++) {
        const displacement = this._pos[i] - this._target[i];
        const accel = (-stiffness * displacement - damping * this._vel[i]) / mass;
        this._vel[i] += accel * h; // semi-implicit Euler
        this._pos[i] += this._vel[i] * h;
      }
    }
    if (this._onUpdate) this._onUpdate(this.value, this);
    if (this._atRest()) {
      this._pos = [...this._target];
      this._vel = this._vel.map(() => 0);
      if (this._onUpdate) this._onUpdate(this.value, this);
      this._complete();
    }
  }

  _atRest() {
    const { restDelta, restSpeed } = this._cfg;
    for (let i = 0; i < this._pos.length; i++) {
      if (Math.abs(this._pos[i] - this._target[i]) > restDelta) return false;
      if (Math.abs(this._vel[i]) > restSpeed) return false; // vel is units/s
    }
    return true;
  }

  _complete() {
    this._teardown();
    this._done = true;
    if (this._onComplete) this._onComplete(this.value);
    this._settle({ finished: true, cancelled: false, value: this.value });
  }

  _teardown() {
    if (this._remove) {
      this._remove();
      this._remove = null;
    }
    this._playing = false;
  }
}

