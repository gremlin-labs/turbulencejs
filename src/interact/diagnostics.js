export function sessionDiagnostics(session) {
  return Object.freeze({
    state: session.state,
    targetCount: session.targets.size,
    listenerCount: session.listeners.size,
    activePerformances: session.performances.size,
    liveValueCount: session.liveValues.size,
    capturedPointerCount: session.pointerCaptures.size,
    lastPointerType: session.lastPointerType || '',
    cleanupCount: session.cleanups.size,
    destroyed: session.state === 'destroyed' ? 1 : 0
  });
}
