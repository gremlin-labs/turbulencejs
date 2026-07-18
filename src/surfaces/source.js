import { surfaceError, surfaceErrorCodes } from './errors';
import { applySurfacePolicy, defaultSurfacePolicy } from './policy';

const SOURCE = Symbol('turbulencejs.surface.source');

function descriptor(type, value) {
  if (!value) throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, `Surface ${type} source is required.`, { type });
  return Object.freeze({ [SOURCE]: true, type, value });
}

export const source = Object.freeze({
  image: value => descriptor('image', value),
  canvas: value => descriptor('canvas', value),
  imageBitmap: value => descriptor('image-bitmap', value),
  imageData: value => descriptor('image-data', value),
  from(value) {
    if (value?.[SOURCE]) return value;
    if (typeof HTMLImageElement !== 'undefined' && value instanceof HTMLImageElement) return descriptor('image', value);
    if (typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement) return descriptor('canvas', value);
    if (typeof ImageData !== 'undefined' && value instanceof ImageData) return descriptor('image-data', value);
    if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) return descriptor('image-bitmap', value);
    if (value?.data instanceof Uint8ClampedArray && Number.isFinite(value.width) && Number.isFinite(value.height)) {
      return descriptor('image-data', value);
    }
    throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'Unsupported surface source.', { receivedType: typeof value });
  }
});

function assertActive(signal) {
  if (signal?.aborted) throw surfaceError(surfaceErrorCodes.ABORTED, 'Surface source resolution was aborted.');
}

function dimensions(type, value) {
  if (type === 'image') {
    if (!value.complete || value.naturalWidth === 0) {
      throw surfaceError(surfaceErrorCodes.NOT_READY, 'Image source must be completely loaded before playback.');
    }
    return { width: value.naturalWidth, height: value.naturalHeight };
  }
  return { width: Number(value.width), height: Number(value.height) };
}

function context2d(canvas) {
  let context;
  try {
    context = canvas.getContext('2d', { willReadFrequently: true });
  } catch (error) {
    throw surfaceError(surfaceErrorCodes.ALLOCATION, 'Could not allocate a Canvas2D source context.', {}, error);
  }
  if (!context) throw surfaceError(surfaceErrorCodes.ALLOCATION, 'Canvas2D is unavailable for source resolution.');
  return context;
}

export function resolveSurfaceSource(input, options = {}) {
  assertActive(options.signal);
  const resolved = source.from(typeof input === 'function' ? input() : input);
  const value = resolved.value;
  const size = dimensions(resolved.type, value);
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
    throw surfaceError(surfaceErrorCodes.ZERO_AREA, 'Surface source has zero or invalid area.', size);
  }
  if (!Number.isInteger(size.width) || !Number.isInteger(size.height)) {
    throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'Surface source dimensions must be integers.', size);
  }
  if (resolved.type === 'image-data'
      && (!(value.data instanceof Uint8ClampedArray) || value.data.length !== size.width * size.height * 4)) {
    throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'ImageData pixels must be a width × height × 4 Uint8ClampedArray.', {
      width: size.width, height: size.height, pixelLength: value.data?.length
    });
  }
  const policyOverrides = { ...(options.policy || {}) };
  Object.keys(defaultSurfacePolicy).filter(key => key !== 'mode').forEach(key => {
    if (options[key] !== undefined) policyOverrides[key] = options[key];
  });
  const policy = applySurfacePolicy({ width: size.width, height: size.height, dpr: options.dpr ?? 1, ...options }, policyOverrides);
  const width = policy.applied.rasterWidth;
  const height = policy.applied.rasterHeight;
  assertActive(options.signal);

  if (resolved.type === 'image-data' && width === size.width && height === size.height) {
    return Object.freeze({ type: resolved.type, width, height, pixels: value.data, originClean: true, policy });
  }

  let canvas;
  try {
    canvas = (value.ownerDocument || document).createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  } catch (error) {
    throw surfaceError(surfaceErrorCodes.ALLOCATION, 'Could not allocate a source canvas.', { width, height }, error);
  }
  const context = context2d(canvas);
  try {
    if (resolved.type === 'image-data') {
      const temporary = (value.ownerDocument || document).createElement('canvas');
      temporary.width = size.width;
      temporary.height = size.height;
      context2d(temporary).putImageData(value, 0, 0);
      context.drawImage(temporary, 0, 0, width, height);
    } else {
      context.drawImage(value, 0, 0, width, height);
    }
    assertActive(options.signal);
    const pixels = context.getImageData(0, 0, width, height).data;
    return Object.freeze({ type: resolved.type, width, height, pixels, originClean: true, policy });
  } catch (error) {
    if (error?.name === 'SecurityError') {
      throw surfaceError(surfaceErrorCodes.TAINTED, 'Surface pixels are not origin-clean.', { type: resolved.type }, error);
    }
    if (error instanceof Error && error.name === 'SurfaceError') throw error;
    throw surfaceError(surfaceErrorCodes.ALLOCATION, 'Surface pixels could not be read.', { width, height }, error);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function isSurfaceSource(value) { return Boolean(value?.[SOURCE]); }
