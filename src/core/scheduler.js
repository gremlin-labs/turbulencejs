import { rafDriver } from '../runtime';

export function createFrameScheduler(driver, clock) {
  if (!driver || typeof driver.schedule !== 'function' || typeof driver.cancel !== 'function') {
    throw new TypeError('Frame scheduler requires a schedule/cancel driver.');
  }
  let nextId = 0;
  let frameHandle = null;
  const callbacks = new Map();

  const ensureFrame = () => {
    if (frameHandle === null && callbacks.size > 0) frameHandle = driver.schedule(flush);
  };

  const flush = timestamp => {
    frameHandle = null;
    const current = [...callbacks.values()];
    callbacks.clear();
    for (const callback of current) callback(timestamp);
    ensureFrame();
  };

  return Object.freeze({
    schedule(callback) {
      const id = ++nextId;
      callbacks.set(id, callback);
      ensureFrame();
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
      if (callbacks.size === 0 && frameHandle !== null) {
        driver.cancel(frameHandle);
        frameHandle = null;
      }
    },
    clear() {
      callbacks.clear();
      if (frameHandle !== null) driver.cancel(frameHandle);
      frameHandle = null;
    },
    now() {
      if (typeof clock === 'function') return clock();
      if (Number.isFinite(driver.now)) return driver.now;
      return performance.now();
    },
    get size() { return callbacks.size; },
    get running() { return frameHandle !== null; }
  });
}

export const browserScheduler = createFrameScheduler(rafDriver());
