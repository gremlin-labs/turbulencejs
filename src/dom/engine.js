import { Turbulence, rafDriver } from '../runtime';

export function detectReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createEngine(options = {}) {
  const engine = new Turbulence({
    driver: options.driver || rafDriver(),
    reducedMotion: options.reducedMotion ?? detectReducedMotion()
  });

  let removePreferenceListener = null;
  if (options.reducedMotion === undefined && typeof window !== 'undefined' && window.matchMedia) {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = event => {
      engine.reducedMotion = event.matches;
    };

    if (query.addEventListener) {
      query.addEventListener('change', onChange);
      removePreferenceListener = () => query.removeEventListener?.('change', onChange);
    } else if (query.addListener) {
      query.addListener(onChange);
      removePreferenceListener = () => query.removeListener?.(onChange);
    }
  }

  const disposeRuntime = engine.dispose.bind(engine);
  engine.dispose = () => {
    removePreferenceListener?.();
    removePreferenceListener = null;
    disposeRuntime();
  };

  return engine;
}

