import { surfaceError, surfaceErrorCodes } from '../errors';
import { applySurfacePolicy } from '../policy';
import { source } from '../source';
import { cloneElementForCapture } from '../capture/clone';
import { serializeCapture } from '../capture/serialize';
import { inlineCaptureAssets } from '../capture/assets';

function waitForImage(image, signal, timeout) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(() => reject(surfaceError(surfaceErrorCodes.NOT_READY, 'Element capture timed out.'))), timeout);
    const onAbort = () => finish(() => reject(surfaceError(surfaceErrorCodes.ABORTED, 'Element capture was aborted.')));
    const onLoad = () => finish(resolve);
    const onError = error => finish(() => reject(surfaceError(surfaceErrorCodes.NOT_READY, 'Serialized element could not be decoded.', {}, error)));
    function finish(callback) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      callback();
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
    if (signal?.aborted) onAbort();
  });
}

async function captureElementInternal(element, options) {
  if (options.signal?.aborted) throw surfaceError(surfaceErrorCodes.ABORTED, 'Element capture was aborted.');
  const prepared = cloneElementForCapture(element, options);
  const decision = applySurfacePolicy({
    width: prepared.rect.width,
    height: prepared.rect.height,
    dpr: options.dpr ?? element.ownerDocument.defaultView?.devicePixelRatio ?? 1
  }, options.policy);
  if (options.fonts !== 'skip' && element.ownerDocument.fonts?.ready) {
    let fontTimer;
    try {
      await Promise.race([
        element.ownerDocument.fonts.ready,
        new Promise((_, reject) => {
          fontTimer = setTimeout(() => reject(surfaceError(surfaceErrorCodes.NOT_READY, 'Document fonts did not become ready.')), options.timeout ?? 5000);
        })
      ]);
    } finally { clearTimeout(fontTimer); }
  }
  if (options.signal?.aborted) throw surfaceError(surfaceErrorCodes.ABORTED, 'Element capture was aborted.');
  await inlineCaptureAssets(prepared.assets, options, prepared.diagnostics);
  const svg = serializeCapture(prepared.clone, decision.applied.rasterWidth, decision.applied.rasterHeight);
  // Blob-backed SVG foreignObject images are treated as non-origin-clean by
  // Chromium even when every captured asset is local. A data URL preserves
  // the supported-subset capture's origin-clean pixel contract.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  try {
    image.src = url;
    await waitForImage(image, options.signal, options.timeout ?? 5000);
    const canvas = element.ownerDocument.createElement('canvas');
    canvas.width = decision.applied.rasterWidth;
    canvas.height = decision.applied.rasterHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw surfaceError(surfaceErrorCodes.ALLOCATION, 'Canvas2D is unavailable for element capture.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let imageData;
    try { imageData = context.getImageData(0, 0, canvas.width, canvas.height); }
    catch (error) { throw surfaceError(surfaceErrorCodes.TAINTED, 'Captured element assets are not origin-clean.', {}, error); }
    canvas.width = 0;
    canvas.height = 0;
    return Object.freeze({
      source: source.imageData(imageData),
      diagnostics: Object.freeze({ ...prepared.diagnostics, policy: decision })
    });
  } finally { image.removeAttribute?.('src'); }
}

export async function captureElement(element, options = {}) {
  const timeout = Number(options.timeout ?? 5000);
  if (!Number.isFinite(timeout) || timeout < 0) throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, 'Element capture timeout must be non-negative.');
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) onAbort();
  else options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    return await captureElementInternal(element, { ...options, timeout, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw surfaceError(surfaceErrorCodes.NOT_READY, 'Element capture timed out.', { timeout }, error);
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
