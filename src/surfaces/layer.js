import { surfaceError, surfaceErrorCodes } from './errors';

export function createSurfaceLayer(target, options = {}) {
  if (!target?.isConnected) throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'Surface target must be connected.');
  const document = target.ownerDocument;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    throw surfaceError(surfaceErrorCodes.ZERO_AREA, 'Surface target has zero area.', { width: rect.width, height: rect.height });
  }
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.turbulencejsSurface = '';
  Object.assign(canvas.style, {
    position: 'absolute',
    pointerEvents: 'none',
    left: `${rect.left + (document.defaultView?.scrollX || 0)}px`,
    top: `${rect.top + (document.defaultView?.scrollY || 0)}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: String(options.zIndex ?? 2147483000),
    overflow: options.clip === false ? 'visible' : 'hidden'
  });
  canvas.width = options.width;
  canvas.height = options.height;
  (options.container || document.body).append(canvas);
  let disposed = false;
  return Object.freeze({
    canvas,
    rect: Object.freeze({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }),
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.remove();
      // A canvas transferred to an OffscreenCanvas remains size-locked on the
      // main thread. Removing it releases the DOM layer; resizing is only a
      // best-effort allocation hint for main-thread renderers.
      try {
        canvas.width = 0;
        canvas.height = 0;
      } catch { /* transferred canvas */ }
    }
  });
}
