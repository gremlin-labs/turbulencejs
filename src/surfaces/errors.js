export const surfaceErrorCodes = Object.freeze({
  UNSUPPORTED_INPUT: 'SURFACE_UNSUPPORTED_INPUT',
  NOT_READY: 'SURFACE_SOURCE_NOT_READY',
  ZERO_AREA: 'SURFACE_ZERO_AREA',
  TAINTED: 'SURFACE_TAINTED_PIXELS',
  ALLOCATION: 'SURFACE_ALLOCATION_FAILED',
  ABORTED: 'SURFACE_ABORTED',
  CONTEXT_LOST: 'SURFACE_CONTEXT_LOST',
  POLICY_REJECTED: 'SURFACE_POLICY_REJECTED'
});

export class SurfaceError extends Error {
  constructor(code, message, details = {}, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'SurfaceError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function surfaceError(code, message, details, cause) {
  return new SurfaceError(code, message, details, cause);
}
