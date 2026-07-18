import {
  TRANSFORM_DEFAULTS,
  applyStyle,
  coerceStyleValue,
  readStyle,
  splitProps,
  transformCss
} from './styles';

export class DomAnimator {
  constructor(engine) {
    this._engine = engine;
    this._elements = new WeakMap();
    this._owned = new Set();
    this._disposed = false;
  }

  _stateFor(element) {
    if (this._disposed) throw new Error('turbulence: DomAnimator is disposed');
    let state = this._elements.get(element);
    if (!state) {
      state = { transform: { ...TRANSFORM_DEFAULTS }, tweens: new Map() };
      this._elements.set(element, state);
    }
    return state;
  }

  set(element, properties) {
    const state = this._stateFor(element);
    const { transformTo, styleProps } = splitProps(properties);
    if (transformTo) {
      this._cancelChannel(state, 'transform');
      state.transform = { ...state.transform, ...transformTo };
      element.style.transform = transformCss(state.transform);
    }
    for (const [key, value] of styleProps) {
      this._cancelChannel(state, key);
      applyStyle(element, key, value);
    }
  }

  animate(element, properties, options = {}) {
    const state = this._stateFor(element);
    const { transformTo, styleProps } = splitProps(properties);
    const tweens = [];

    if (transformTo) {
      const to = { ...state.transform, ...transformTo };
      tweens.push(this._channelTween(state, 'transform', state.transform, to, options, value => {
        state.transform = value;
        element.style.transform = transformCss(value);
      }));
    }

    for (const [key, value] of styleProps) {
      const from = options.from?.[key] ?? readStyle(element, key);
      tweens.push(this._channelTween(state, key, coerceStyleValue(from, value), value, options, next => applyStyle(element, key, next)));
    }

    return {
      finished: Promise.all(tweens.map(tween => tween.finished)).then(results => ({
        finished: results.every(result => result.finished),
        cancelled: results.some(result => result.cancelled)
      })),
      cancel: () => tweens.forEach(tween => tween.cancel())
    };
  }

  cancelAll() {
    for (const tween of [...this._owned]) tween.cancel();
  }

  dispose() {
    if (this._disposed) return;
    this.cancelAll();
    this._disposed = true;
  }

  _channelTween(state, channel, from, to, options, apply) {
    const existing = state.tweens.get(channel);
    if (existing?.playing) {
      existing.retarget(to, options);
      return existing;
    }
    const tween = this._engine.tween({
      from,
      to,
      duration: options.duration ?? 220,
      easing: options.easing ?? 'smooth',
      delay: options.delay,
      onUpdate: apply
    });
    state.tweens.set(channel, tween);
    this._owned.add(tween);
    tween.finished.then(() => {
      this._owned.delete(tween);
      if (state.tweens.get(channel) === tween) state.tweens.delete(channel);
    });
    return tween;
  }

  _cancelChannel(state, channel) {
    const tween = state.tweens.get(channel);
    if (tween) {
      tween.cancel();
      state.tweens.delete(channel);
      this._owned.delete(tween);
    }
  }
}

