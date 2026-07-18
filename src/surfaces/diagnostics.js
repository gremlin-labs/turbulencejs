export function surfaceDiagnostics(source, renderer, extra = {}) {
  return Object.freeze({
    sourceType: source.type,
    renderer: renderer.type,
    width: source.width,
    height: source.height,
    degraded: source.policy.degradations.length > 0 ? 1 : 0,
    degradationCount: source.policy.degradations.length,
    requestedRenderer: renderer.requestedRenderer || renderer.type,
    fallbackCount: Math.max(0, (renderer.fallbackChain?.length || 1) - 1),
    ...extra
  });
}
