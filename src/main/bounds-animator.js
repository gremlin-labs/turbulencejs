import { roundRect } from '../runtime';

export function safeSetBounds(target, bounds) {
  try {
    if (typeof target.isDestroyed === 'function' && target.isDestroyed()) return false;
    target.setBounds(bounds);
    return true;
  } catch {
    return false;
  }
}

export class BoundsAnimator {
  constructor(engine) {
    this._engine = engine;
    this._tweens = new Map();
    this._disposed = false;
  }

  set(target, bounds) {
    this._assertActive();
    this.cancel(target);
    return safeSetBounds(target, roundRect(bounds));
  }

  animate(target, to, options = {}) {
    this._assertActive();
    const existing = this._tweens.get(target);
    if (existing?.playing) {
      existing.retarget(to, options);
      return existing;
    }

    let from;
    try {
      from = target.getBounds();
    } catch {
      return this._engine.tween({ from: 0, to: 0, duration: 0 });
    }

    let tween;
    tween = this._engine.tween({
      from,
      to,
      duration: options.duration ?? 240,
      easing: options.easing ?? 'smooth',
      delay: options.delay,
      onUpdate: bounds => {
        if (!safeSetBounds(target, roundRect(bounds)) && tween) tween.cancel();
      },
      onComplete: options.onComplete,
      onCancel: options.onCancel
    });
    this._tweens.set(target, tween);
    tween.finished.then(() => {
      if (this._tweens.get(target) === tween) this._tweens.delete(target);
    });
    return tween;
  }

  isAnimating(target) {
    const tween = this._tweens.get(target);
    return Boolean(tween?.playing);
  }

  cancel(target) {
    const tween = this._tweens.get(target);
    if (tween) {
      tween.cancel();
      this._tweens.delete(target);
    }
  }

  cancelAll() {
    for (const tween of this._tweens.values()) tween.cancel();
    this._tweens.clear();
  }

  dispose() {
    if (this._disposed) return;
    this.cancelAll();
    this._disposed = true;
  }

  _assertActive() {
    if (this._disposed) throw new Error('turbulence: BoundsAnimator is disposed');
  }
}
