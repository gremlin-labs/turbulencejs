// A Ticker fans one scheduled callback out to subscribers as (dt, now) and
// stops scheduling entirely when nobody is subscribed — no idle timers.
//
// Drivers adapt the host scheduling primitive:
//   rafDriver()    — requestAnimationFrame (renderer / browser)
//   timerDriver()  — setTimeout pacing (Electron main process, Node)
//   manualDriver() — deterministic stepping for tests

export const MAX_DT = 64; // clamp long stalls (tab hidden, debugger) to keep motion stable

export class Ticker {
  constructor(driver) {
    this._driver = driver;
    this._fns = new Set();
    this._handle = null;
    this._last = null;
    this._tick = this._tick.bind(this);
  }

  get running() {
    return this._handle !== null;
  }

  get size() {
    return this._fns.size;
  }

  add(fn) {
    this._fns.add(fn);
    if (this._handle === null) {
      this._last = null;
      this._schedule();
    }
    return () => this.remove(fn);
  }

  remove(fn) {
    this._fns.delete(fn);
    if (this._fns.size === 0 && this._handle !== null) {
      this._driver.cancel(this._handle);
      this._handle = null;
      this._last = null;
    }
  }

  _schedule() {
    this._handle = this._driver.schedule(this._tick);
  }

  _tick(now) {
    this._handle = null;
    const dt = this._last === null ? 0 : Math.min(now - this._last, MAX_DT);
    this._last = now;
    for (const fn of [...this._fns]) {
      try {
        fn(dt, now);
      } catch (err) {
        this._fns.delete(fn);
        // Surface once, loudly, then remove the offending callback.
        console.error('turbulence: ticker callback threw and was removed', err);
      }
    }
    if (this._fns.size > 0) this._schedule();
    else this._last = null;
  }
}

export function rafDriver() {
  return {
    schedule: (cb) => requestAnimationFrame(cb),
    cancel: (h) => cancelAnimationFrame(h),
  };
}

// High-cadence timer for processes without rAF (Electron main). Tracks an
// absolute next-frame deadline so timer jitter does not accumulate as drift.
export function timerDriver(fps = 60) {
  const frame = 1000 / fps;
  let due = null;
  return {
    schedule(cb) {
      const now = performance.now();
      due = due === null || due <= now - frame ? now + frame : due + frame;
      const handle = setTimeout(() => cb(performance.now()), Math.max(0, due - now));
      if (handle.unref) handle.unref();
      return handle;
    },
    cancel(h) {
      clearTimeout(h);
      due = null;
    },
  };
}

// Deterministic driver for tests: nothing runs until step()/flush() is called.
export function manualDriver(start = 0) {
  let now = start;
  let pending = null;
  return {
    schedule(cb) {
      pending = cb;
      return 1;
    },
    cancel() {
      pending = null;
    },
    // Advance the virtual clock and fire the pending frame, if any.
    step(ms) {
      now += ms;
      const cb = pending;
      pending = null;
      if (cb) cb(now);
      return pending !== null; // true if more work got scheduled
    },
    get now() {
      return now;
    },
    get hasPending() {
      return pending !== null;
    },
  };
}

