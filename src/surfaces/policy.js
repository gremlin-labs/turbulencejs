import { surfaceError, surfaceErrorCodes } from './errors';

export const defaultSurfacePolicy = Object.freeze({
  maxCssWidth: 4096,
  maxCssHeight: 4096,
  maxRasterWidth: 4096,
  maxRasterHeight: 4096,
  maxDpr: 2,
  maxSamples: 20000,
  maxParticles: 12000,
  maxDomBlocks: 2500,
  maxAllocationBytes: 64 * 1024 * 1024,
  maxWorkerBacklog: 2,
  mode: 'degrade'
});

const numericKeys = Object.keys(defaultSurfacePolicy).filter(key => key !== 'mode');

export function createSurfacePolicy(overrides = {}) {
  const policy = { ...defaultSurfacePolicy, ...overrides };
  for (const key of numericKeys) {
    const value = Number(policy[key]);
    if (!Number.isFinite(value) || value <= 0) {
      throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, `Surface policy ${key} must be a finite positive number.`, { key });
    }
    policy[key] = Math.floor(value);
  }
  if (!['degrade', 'reject'].includes(policy.mode)) {
    throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, 'Surface policy mode must be "degrade" or "reject".', { key: 'mode' });
  }
  return Object.freeze(policy);
}

function clamp(requested, maximum, name, degradations) {
  if (requested <= maximum) return requested;
  degradations.push(Object.freeze({ field: name, requested, applied: maximum, reason: 'policy-cap' }));
  return maximum;
}

export function applySurfacePolicy(request = {}, overrides = {}) {
  const policy = createSurfacePolicy(overrides);
  const requested = Object.freeze({
    cssWidth: Number(request.cssWidth ?? request.width ?? 0),
    cssHeight: Number(request.cssHeight ?? request.height ?? 0),
    dpr: Number(request.dpr ?? 1),
    samples: Number(request.samples ?? 0),
    particles: Number(request.particles ?? request.samples ?? 0),
    domBlocks: Number(request.domBlocks ?? request.samples ?? 0),
    workerBacklog: Number(request.workerBacklog ?? 1)
  });
  if (!Number.isFinite(requested.cssWidth) || !Number.isFinite(requested.cssHeight)
      || requested.cssWidth <= 0 || requested.cssHeight <= 0) {
    throw surfaceError(surfaceErrorCodes.ZERO_AREA, 'Surface dimensions must have positive finite area.', {
      width: requested.cssWidth, height: requested.cssHeight
    });
  }
  const degradations = [];
  const cssWidth = clamp(requested.cssWidth, policy.maxCssWidth, 'cssWidth', degradations);
  const cssHeight = clamp(requested.cssHeight, policy.maxCssHeight, 'cssHeight', degradations);
  let dpr = clamp(Math.max(0.1, requested.dpr), policy.maxDpr, 'dpr', degradations);
  dpr = Math.min(dpr, policy.maxRasterWidth / cssWidth, policy.maxRasterHeight / cssHeight);
  const allocationDpr = Math.sqrt(policy.maxAllocationBytes / (cssWidth * cssHeight * 8));
  dpr = Math.max(0.1, Math.min(dpr, allocationDpr));
  const applied = Object.freeze({
    cssWidth,
    cssHeight,
    dpr,
    rasterWidth: Math.max(1, Math.floor(cssWidth * dpr)),
    rasterHeight: Math.max(1, Math.floor(cssHeight * dpr)),
    samples: clamp(Math.max(0, requested.samples), policy.maxSamples, 'samples', degradations),
    particles: clamp(Math.max(0, requested.particles), policy.maxParticles, 'particles', degradations),
    domBlocks: clamp(Math.max(0, requested.domBlocks), policy.maxDomBlocks, 'domBlocks', degradations),
    workerBacklog: clamp(Math.max(1, requested.workerBacklog), policy.maxWorkerBacklog, 'workerBacklog', degradations)
  });
  if (dpr < requested.dpr) {
    degradations.push(Object.freeze({ field: 'dpr', requested: requested.dpr, applied: dpr, reason: 'raster-or-allocation-cap' }));
  }
  if (policy.mode === 'reject' && degradations.length > 0) {
    throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, 'Requested surface exceeds the configured resource policy.', {
      degradations
    });
  }
  return Object.freeze({ policy, requested, applied, degradations: Object.freeze(degradations) });
}
