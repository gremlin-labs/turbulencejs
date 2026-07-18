import { InteractionError, interactionErrorCodes } from './errors';
import { sessionDiagnostics } from './diagnostics';

const states = new Set(['active', 'suspended', 'settling', 'cancelled', 'destroyed']);

export function createInteractionSession(options = {}) {
  const abortController = new AbortController();
  const session = {
    state: 'active',
    targets: new Set(),
    listeners: new Set(),
    performances: new Set(),
    liveValues: new Map(),
    pointerCaptures: new Map(),
    cleanups: new Set(),
    lastPointerType: '',
    focusTarget: null
  };
  let destroyed = false;

  function assertAlive() {
    if (destroyed) throw new InteractionError(interactionErrorCodes.DESTROYED, 'Interaction session is destroyed.');
  }

  function setState(next) {
    if (!states.has(next)) throw new InteractionError(interactionErrorCodes.INVALID_STATE, `Unknown interaction state "${next}".`);
    if (destroyed && next !== 'destroyed') return controller;
    session.state = next;
    options.onStateChange?.(next, controller);
    return controller;
  }

  function cleanup(callback) {
    assertAlive();
    if (typeof callback !== 'function') throw new TypeError('Interaction cleanup requires a function.');
    let active = true;
    const owned = () => { if (active) { active = false; callback(); } };
    session.cleanups.add(owned);
    return () => { owned(); session.cleanups.delete(owned); };
  }

  function listen(target, type, listener, eventOptions) {
    assertAlive();
    target.addEventListener(type, listener, eventOptions);
    const record = { target, type, listener, eventOptions };
    session.listeners.add(record);
    cleanup(() => {
      target.removeEventListener(type, listener, eventOptions);
      session.listeners.delete(record);
    });
    return listener;
  }

  function ownPerformance(performance) {
    assertAlive();
    if (performance) session.performances.add(performance);
    return performance;
  }

  function releasePerformance(performance) {
    session.performances.delete(performance);
    if (session.performances.size === 0 && session.state === 'settling') setState('active');
  }

  function ownStyle(target, properties) {
    assertAlive();
    const snapshot = new Map(properties.map(property => [property, target.style[property]]));
    cleanup(() => snapshot.forEach((value, property) => { target.style[property] = value; }));
  }

  function ownAttribute(target, name) {
    assertAlive();
    const present = target.hasAttribute(name);
    const value = target.getAttribute(name);
    cleanup(() => { if (present) target.setAttribute(name, value); else target.removeAttribute(name); });
  }

  function capturePointer(target, pointerId) {
    assertAlive();
    target.setPointerCapture?.(pointerId);
    session.pointerCaptures.set(pointerId, target);
  }

  function releasePointer(pointerId) {
    const target = session.pointerCaptures.get(pointerId);
    if (!target) return;
    if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    session.pointerCaptures.delete(pointerId);
  }

  function suspend() {
    if (destroyed) return controller;
    session.performances.forEach(performance => performance.capabilities?.pause && performance.pause());
    return setState('suspended');
  }

  function resume() {
    if (destroyed || session.state !== 'suspended') return controller;
    session.performances.forEach(performance => performance.state === 'paused' && performance.resume());
    return setState('active');
  }

  function cancel() {
    if (destroyed || session.state === 'cancelled') return controller;
    setState('cancelled');
    session.performances.forEach(performance => {
      try { performance.stop?.(); } catch (error) { options.onError?.(error, controller); }
    });
    session.performances.clear();
    session.pointerCaptures.forEach((_target, pointerId) => releasePointer(pointerId));
    return controller;
  }

  function destroy() {
    if (destroyed) return controller;
    cancel();
    destroyed = true;
    session.state = 'destroyed';
    abortController.abort();
    for (const owned of [...session.cleanups].reverse()) {
      try { owned(); } catch (error) { options.onError?.(error, controller); }
    }
    session.cleanups.clear();
    session.listeners.clear();
    session.targets.clear();
    session.liveValues.clear();
    if (options.restoreFocus !== false && session.focusTarget?.isConnected) session.focusTarget.focus();
    options.onStateChange?.('destroyed', controller);
    options.onDestroy?.(controller);
    return controller;
  }

  const controller = {
    setState, cleanup, listen, ownPerformance, releasePerformance, ownStyle, ownAttribute,
    capturePointer, releasePointer, suspend, resume, cancel, destroy,
    addTarget(target) { assertAlive(); session.targets.add(target); return controller; },
    removeTarget(target) { session.targets.delete(target); return controller; },
    setLiveValue(name, value) { assertAlive(); session.liveValues.set(name, value); return controller; },
    getLiveValue(name) { return session.liveValues.get(name); },
    rememberFocus(target = document.activeElement) { session.focusTarget = target; return controller; },
    setLastPointerType(value) { session.lastPointerType = value || ''; return controller; },
    get signal() { return abortController.signal; },
    get state() { return session.state; },
    get diagnostics() { return sessionDiagnostics(session); }
  };

  if (options.signal) {
    if (options.signal.aborted) queueMicrotask(destroy);
    else options.signal.addEventListener('abort', destroy, { once: true });
    cleanup(() => options.signal.removeEventListener('abort', destroy));
  }
  return controller;
}
