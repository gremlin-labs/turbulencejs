import { createInteractionSession } from './session';
import { resolveInteractionTargets } from './targets';
import { hoverInputAvailable, focusVisible } from './media';
import { InteractionError, interactionErrorCodes } from './errors';

const policies = new Set(['reverse', 'restart', 'finish', 'ignore', 'queue-latest']);

export function createHover(turbulencejs, targetSource, options = {}) {
  const policy = options.interruption || 'reverse';
  if (!policies.has(policy)) throw new RangeError(`Unknown hover interruption policy "${policy}".`);
  if (!turbulencejs?.turb || typeof turbulencejs.script !== 'function') throw new TypeError('hover requires the public Turbulence runtime.');
  const view = options.view || window;
  const root = options.root || document;
  const documentRoot = root.nodeType === 9 ? root : root.ownerDocument;
  const session = createInteractionSession({
    signal: options.signal,
    onStateChange: options.onStateChange,
    onDestroy: options.onDestroy,
    onError: options.onError
  });
  const active = new Map();
  let targets = [];

  function resolveRecipe(value, target, index, phase) {
    try {
      const context = Object.freeze({ target, index, count: targets.length, context: options.context, phase });
      const recipe = typeof value === 'function' && !turbulencejs.turb.isTurb(value) ? value(target, index, context) : value;
      if (!turbulencejs.turb.isTurb(recipe)) throw new TypeError(`hover ${phase} must resolve to a Turb value.`);
      return recipe;
    } catch (error) {
      const wrapped = new InteractionError(interactionErrorCodes.FACTORY_FAILED, `Hover ${phase} factory failed.`, { phase, index }, error);
      options.onError?.(wrapped, session);
      return null;
    }
  }

  function release(target, performance) {
    session.releasePerformance(performance);
    if (!target.isConnected) {
      active.delete(target);
      session.removeTarget(target);
      targets = targets.filter(value => value !== target);
      return;
    }
    const record = active.get(target);
    if (!record || record.performance !== performance) return;
    if (record.queued) {
      const queued = record.queued;
      active.delete(target);
      transition(target, queued);
    } else active.delete(target);
  }

  function start(target, phase) {
    if (!target.isConnected || session.state === 'destroyed') { active.delete(target); return; }
    const index = Math.max(0, targets.indexOf(target));
    const recipe = resolveRecipe(options[phase], target, index, phase);
    if (!recipe) return;
    let performance;
    performance = turbulencejs.script(recipe).play(target, {
      seed: `${options.seed ?? 'turbulencejs-hover'}:${index}:${phase}`,
      context: options.context,
      respectReducedMotion: options.respectReducedMotion,
      reducedMotion: options.reducedMotion,
      onComplete: () => release(target, performance),
      onCancel: () => release(target, performance),
      onError: error => options.onError?.(error, session)
    });
    active.set(target, { phase, performance, queued: null });
    session.ownPerformance(performance);
    session.setState('settling');
  }

  function transition(target, phase) {
    if (!options[phase]) return;
    if (options.ownership === 'shared') {
      for (const other of active.keys()) if (other !== target) transition(other, 'leave');
    }
    const current = active.get(target);
    if (!current) { start(target, phase); return; }
    if (current.phase === phase && policy !== 'restart') return;
    if (policy === 'ignore') return;
    if (policy === 'queue-latest') { current.queued = phase; return; }
    if (policy === 'finish') current.performance.finish();
    else if (policy === 'reverse' && current.performance.capabilities.reverse) {
      current.phase = phase;
      current.performance.reverse();
      return;
    } else current.performance.stop();
    start(target, phase);
  }

  function pointerAllowed(event) {
    session.setLastPointerType(event.pointerType || 'mouse');
    if (event.pointerType === 'touch') return options.touch === 'allow';
    return options.forceHover === true || hoverInputAvailable(view);
  }

  function enter(event, target = event.currentTarget) {
    if (!pointerAllowed(event) || !target?.isConnected) return;
    transition(target, 'enter');
  }
  function leave(event, target = event.currentTarget) {
    if (!pointerAllowed(event)) return;
    transition(target, 'leave');
  }
  function focusIn(event, target = event.currentTarget) {
    if (options.focus === false || !focusVisible(target)) return;
    transition(target, 'enter');
  }
  function focusOut(_event, target = _event.currentTarget) {
    if (options.focus === false) return;
    transition(target, 'leave');
  }

  function bind(target) {
    session.addTarget(target);
    session.listen(target, 'pointerenter', enter);
    session.listen(target, 'pointerleave', leave);
    session.listen(target, 'focusin', focusIn);
    session.listen(target, 'focusout', focusOut);
  }

  if (options.delegate) {
    if (typeof targetSource !== 'string') throw new TypeError('Delegated hover requires a selector target.');
    const matched = event => event.target.closest?.(targetSource);
    session.listen(root, 'pointerover', event => {
      const target = matched(event);
      if (target && !target.contains(event.relatedTarget)) { if (!targets.includes(target)) targets.push(target); session.addTarget(target); enter(event, target); }
    });
    session.listen(root, 'pointerout', event => {
      const target = matched(event);
      if (target && !target.contains(event.relatedTarget)) leave(event, target);
    });
    session.listen(root, 'focusin', event => { const target = matched(event); if (target) { if (!targets.includes(target)) targets.push(target); session.addTarget(target); focusIn(event, target); } });
    session.listen(root, 'focusout', event => { const target = matched(event); if (target && !target.contains(event.relatedTarget)) focusOut(event, target); });
  } else {
    targets = resolveInteractionTargets(targetSource, options);
    targets.forEach(bind);
  }

  const leaveAll = () => [...active.keys()].forEach(target => transition(target, 'leave'));
  session.listen(view, 'blur', leaveAll);
  session.listen(documentRoot, 'visibilitychange', () => { if (documentRoot.visibilityState === 'hidden') leaveAll(); });
  session.listen(documentRoot, 'keydown', event => { if (event.key === 'Escape') leaveAll(); });
  session.cleanup(() => {
    active.forEach(record => record.performance.stop());
    active.clear();
  });
  return session;
}
