import { surfaceError, surfaceErrorCodes } from '../errors';

export function createWorkerRenderer({ canvas, source, mode = 'out', options = {} }) {
  if (typeof canvas.transferControlToOffscreen !== 'function') {
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'OffscreenCanvas transfer is unavailable.');
  }
  const factory = options.workerFactory;
  if (typeof factory !== 'function') {
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'Worker renderer requires an explicit workerFactory for CSP-safe packaging.');
  }
  let worker;
  try {
    worker = factory();
  } catch (error) {
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'Surface worker failed to start.', {}, error);
  }
  if (!worker || typeof worker.postMessage !== 'function' || typeof worker.terminate !== 'function') {
    worker?.terminate?.();
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'workerFactory must return a Worker-compatible object.');
  }
  let offscreen;
  try { offscreen = canvas.transferControlToOffscreen(); }
  catch (error) {
    worker.terminate();
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'OffscreenCanvas transfer failed.', {}, error);
  }
  const maximumBacklog = source.policy.applied.workerBacklog;
  let pending = 0;
  let queued = null;
  let disposed = false;
  let failed = false;
  function send(progress) {
    pending += 1;
    worker.postMessage({ type: 'progress', progress });
  }
  const onMessage = event => {
    if (event.data?.type !== 'rendered') return;
    pending = Math.max(0, pending - 1);
    if (queued !== null && pending < maximumBacklog) {
      const next = queued;
      queued = null;
      send(next);
    }
  };
  const onError = () => { failed = true; };
  worker.addEventListener?.('message', onMessage);
  worker.addEventListener?.('error', onError);
  worker.postMessage({
    type: 'init', canvas: offscreen, width: source.width, height: source.height,
    pixels: source.pixels, mode
  }, [offscreen]);
  return Object.freeze({
    type: 'worker-canvas2d',
    resources: Object.freeze({ workers: 1, canvases: 1, pixels: source.width * source.height }),
    render(progress) {
      if (disposed || failed) throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'Surface worker is unavailable.');
      if (pending >= maximumBacklog) { queued = progress; return; }
      send(progress);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      worker.postMessage({ type: 'dispose' });
      worker.removeEventListener?.('message', onMessage);
      worker.removeEventListener?.('error', onError);
      worker.terminate();
      queued = null;
      pending = 0;
    }
  });
}
