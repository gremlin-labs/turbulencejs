import { roundRect } from 'turbulencejs';

export class Layout {
  constructor(engine, compute, defaults = {}) {
    if (typeof compute !== 'function') throw new Error('turbulence: Layout requires a compute(state) function');
    this._engine = engine;
    this._compute = compute;
    this._defaults = { duration: 280, easing: 'smooth', ...defaults };
    this._appliers = new Map();
    this._rects = null;
    this._tween = null;
    this._disposed = false;
    this.state = null;
  }

  onRegion(name, callback) {
    this._assertActive();
    if (!this._appliers.has(name)) this._appliers.set(name, new Set());
    const callbacks = this._appliers.get(name);
    callbacks.add(callback);
    return () => {
      const deleted = callbacks.delete(callback);
      if (callbacks.size === 0) this._appliers.delete(name);
      return deleted;
    };
  }

  get(region) {
    return this._rects?.[region];
  }

  get rects() {
    return this._rects;
  }

  set(state) {
    this._assertActive();
    this.cancel();
    this.state = state;
    this._rects = this._compute(state);
    this._apply(this._rects);
    return this._rects;
  }

  animateTo(state, options = {}) {
    this._assertActive();
    const target = this._compute(state);
    this.state = state;
    if (!this._rects) {
      this._rects = target;
      this._apply(target);
      return this._engine.tween({ from: 0, to: 0, duration: 0 });
    }
    const resolved = { ...this._defaults, ...options };
    if (this._tween?.playing) {
      this._tween.retarget(target, resolved);
      return this._tween;
    }
    this._tween = this._engine.tween({
      from: this._rects,
      to: target,
      duration: resolved.duration,
      easing: resolved.easing,
      onUpdate: rects => {
        this._rects = rects;
        this._apply(rects);
      },
      onComplete: resolved.onComplete,
      onCancel: resolved.onCancel
    });
    const current = this._tween;
    current.finished.then(() => {
      if (this._tween === current) this._tween = null;
    });
    return current;
  }

  cancel() {
    if (this._tween) {
      this._tween.cancel();
      this._tween = null;
    }
  }

  cancelAll() {
    this.cancel();
  }

  dispose() {
    if (this._disposed) return;
    this.cancel();
    this._appliers.clear();
    this._disposed = true;
  }

  _apply(rects) {
    for (const [region, callbacks] of this._appliers) {
      const rect = rects[region];
      if (!rect) continue;
      const rounded = roundRect(rect);
      for (const callback of callbacks) {
        try {
          callback(rounded, region, this.state);
        } catch (error) {
          console.error(`turbulence: layout applier for "${region}" threw`, error);
        }
      }
    }
  }

  _assertActive() {
    if (this._disposed) throw new Error('turbulence: Layout is disposed');
  }
}
