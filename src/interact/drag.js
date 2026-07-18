import { createInteractionSession } from './session';
import { resolveInteractionTargets } from './targets';
import { geometrySnapshot, pointerDelta, applyAxisGrid } from './coordinates';
import { resolveDragBounds, constrainPosition, clampPosition } from './bounds';
import { createVelocityTracker } from './velocity';
import { snapshotDropZones, dropZoneAt } from './drop-zones';
import { createSpringSignal, settleSpring } from './spring';
import { announceDrag } from './announcements';

const dragStates = new Set([
  'idle', 'armed', 'lifted', 'dragging', 'validating', 'settling',
  'committed', 'rejected', 'cancelled', 'destroyed'
]);

function reducedMotion(options, view) {
  if (typeof options.reducedMotion === 'boolean') return options.reducedMotion;
  return options.respectReducedMotion !== false && view.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function snapshotStyles(element, properties) {
  const values = new Map(properties.map(property => [property, element.style[property]]));
  return () => values.forEach((value, property) => { element.style[property] = value; });
}

function prepareVisual(target, geometry, options) {
  const strategy = options.strategy || 'original';
  const properties = ['transform', 'willChange', 'zIndex', 'position', 'left', 'top', 'width', 'height', 'margin', 'pointerEvents', 'visibility'];
  const restoreTarget = snapshotStyles(target, properties);
  const document = target.ownerDocument;
  let visual = target;
  let placeholder = null;
  let removeVisual = false;
  if (strategy === 'ghost') {
    visual = target.cloneNode(true);
    visual.setAttribute('aria-hidden', 'true');
    visual.removeAttribute('id');
    document.body.append(visual);
    removeVisual = true;
    if (options.sourceVisibility !== 'visible') target.style.visibility = 'hidden';
  } else if (strategy === 'layer') {
    placeholder = target.cloneNode(false);
    placeholder.setAttribute('aria-hidden', 'true');
    Object.assign(placeholder.style, { visibility: 'hidden', width: `${geometry.rect.width}px`, height: `${geometry.rect.height}px` });
    target.before(placeholder);
  } else if (strategy !== 'original') throw new RangeError(`Unknown drag visual strategy "${strategy}".`);

  const restoreVisual = visual === target ? () => {} : snapshotStyles(visual, properties);
  if (strategy !== 'original') {
    Object.assign(visual.style, {
      position: 'fixed', left: `${geometry.rect.left}px`, top: `${geometry.rect.top}px`,
      width: `${geometry.rect.width}px`, height: `${geometry.rect.height}px`, margin: '0'
    });
  }
  Object.assign(visual.style, {
    willChange: 'transform', zIndex: String(options.zIndex ?? 2147483000),
    pointerEvents: 'none'
  });
  const baseTransform = visual.style.transform;
  let cleaned = false;
  return Object.freeze({
    visual, baseTransform,
    cleanup() {
      if (cleaned) return;
      cleaned = true;
      restoreVisual();
      if (removeVisual) visual.remove();
      placeholder?.remove();
      restoreTarget();
    }
  });
}

function transform(base, position) {
  return `translate3d(${position.x}px, ${position.y}px, 0px)${base && base !== 'none' ? ` ${base}` : ''}`;
}

export function createDrag(turbulencejs, targetSource, options = {}) {
  if (!turbulencejs?.turb || typeof turbulencejs.script !== 'function') throw new TypeError('drag requires the public Turbulence runtime.');
  const view = options.view || window;
  const root = options.root || document;
  const targets = resolveInteractionTargets(targetSource, options);
  const session = createInteractionSession({ signal: options.signal, onError: options.onError });
  const velocity = createVelocityTracker();
  let dragState = 'idle';
  let activeTarget = null;
  let activePointerId = null;
  let keyboard = false;
  let origin = null;
  let bounds = null;
  let zones = [];
  let position = { x: 0, y: 0 };
  let renderedPosition = { x: 0, y: 0 };
  let lastPoint = { x: 0, y: 0 };
  let visualOwner = null;
  let followSignal = null;
  let followPerformance = null;
  let motionPerformance = null;
  let validationController = null;
  let validationToken = 0;
  let grabbedSnapshot = null;
  let lastOutcome = '';
  let destroyed = false;

  function setState(next) {
    if (!dragStates.has(next)) throw new RangeError(`Unknown drag state "${next}".`);
    if (destroyed && next !== 'destroyed') return;
    if (dragState === next) return;
    dragState = next;
    options.onDragStateChange?.(next, controller);
  }

  function eventContext(extra = {}) {
    return Object.freeze({
      target: activeTarget,
      visual: visualOwner?.visual || activeTarget,
      position: Object.freeze({ ...position }),
      velocity: velocity.value,
      keyboard,
      ...extra
    });
  }

  function playMotion(recipe, done) {
    if (!recipe || !visualOwner?.visual) { done?.(); return null; }
    let performance;
    const resolved = typeof recipe === 'function' && !turbulencejs.turb.isTurb(recipe) ? recipe(eventContext()) : recipe;
    if (!turbulencejs.turb.isTurb(resolved)) throw new TypeError('Drag motion factory must resolve to a Turb value.');
    performance = turbulencejs.script(resolved).play(visualOwner.visual, {
      context: options.context,
      seed: options.seed ?? 'turbulencejs-drag',
      respectReducedMotion: options.respectReducedMotion,
      onComplete: () => { session.releasePerformance(performance); if (motionPerformance === performance) motionPerformance = null; done?.(); },
      onCancel: () => { session.releasePerformance(performance); if (motionPerformance === performance) motionPerformance = null; }
    });
    session.ownPerformance(performance);
    motionPerformance = performance;
    return performance;
  }

  function applyPosition(next) {
    position = next;
    if (followSignal) followSignal.retarget(next.x, next.y);
    else if (visualOwner?.visual) {
      renderedPosition = { ...next };
      visualOwner.visual.style.transform = transform(visualOwner.baseTransform, next);
    }
    options.onMove?.(eventContext({ zone: dropZoneAt(zones, lastPoint, options.magneticDistance || 0)?.zone || null }));
  }

  function begin(target, input = {}) {
    if (destroyed || dragState !== 'idle' || !target.isConnected) return false;
    activeTarget = target;
    keyboard = input.keyboard === true;
    origin = {
      clientX: input.clientX ?? target.getBoundingClientRect().left,
      clientY: input.clientY ?? target.getBoundingClientRect().top,
      scrollX: view.scrollX || 0,
      scrollY: view.scrollY || 0,
      geometry: geometrySnapshot(target, view)
    };
    bounds = resolveDragBounds(options.bounds, target, origin.geometry, view);
    zones = snapshotDropZones(options.dropZones, { root });
    position = { x: 0, y: 0 };
    renderedPosition = { x: 0, y: 0 };
    lastPoint = { x: input.clientX ?? origin.geometry.rect.left, y: input.clientY ?? origin.geometry.rect.top };
    velocity.reset(position, input.timeStamp || 0);
    setState(input.armed ? 'armed' : 'lifted');
    if (!input.armed) lift();
    return true;
  }

  function lift() {
    if (!activeTarget || (dragState !== 'armed' && dragState !== 'lifted')) return;
    setState('lifted');
    visualOwner = prepareVisual(activeTarget, origin.geometry, options);
    grabbedSnapshot = { present: activeTarget.hasAttribute('aria-grabbed'), value: activeTarget.getAttribute('aria-grabbed') };
    activeTarget.setAttribute('aria-grabbed', 'true');
    if (!reducedMotion(options, view) && options.follow !== 'direct') {
      followSignal = createSpringSignal(turbulencejs.turb, {
        baseTransform: visualOwner.baseTransform,
        ...options.spring,
        onUpdate: value => { renderedPosition = { x: value.x, y: value.y }; }
      });
      followPerformance = turbulencejs.script(followSignal.recipe).play(visualOwner.visual, {
        seed: options.seed ?? 'turbulencejs-drag-follow', respectReducedMotion: false,
        onCancel: () => session.releasePerformance(followPerformance)
      });
      session.ownPerformance(followPerformance);
    }
    playMotion(options.motion?.lift);
    announceDrag(options, 'pickup', eventContext());
    options.onLift?.(eventContext());
  }

  function restoreGrabbed() {
    if (!activeTarget || !grabbedSnapshot) return;
    if (grabbedSnapshot.present) activeTarget.setAttribute('aria-grabbed', grabbedSnapshot.value);
    else activeTarget.removeAttribute('aria-grabbed');
    grabbedSnapshot = null;
  }

  function stopFollow() {
    followPerformance?.stop();
    session.releasePerformance(followPerformance);
    followPerformance = null;
    if (followSignal) renderedPosition = { x: followSignal.value.x, y: followSignal.value.y };
    followSignal = null;
  }

  function finalize(outcome) {
    stopFollow();
    motionPerformance?.stop();
    motionPerformance = null;
    restoreGrabbed();
    visualOwner?.cleanup();
    visualOwner = null;
    validationController?.abort();
    validationController = null;
    lastOutcome = outcome;
    const focusTarget = activeTarget;
    const restoreFocus = keyboard;
    activeTarget = null;
    activePointerId = null;
    keyboard = false;
    origin = null;
    zones = [];
    position = { x: 0, y: 0 };
    renderedPosition = { x: 0, y: 0 };
    setState('idle');
    if (restoreFocus && focusTarget?.isConnected && options.restoreFocus !== false) focusTarget.focus();
  }

  function settle(outcome, endpoint, recipe) {
    stopFollow();
    motionPerformance?.stop();
    session.releasePerformance(motionPerformance);
    motionPerformance = null;
    setState(outcome);
    announceDrag(options, outcome, eventContext());
    const complete = () => finalize(outcome);
    if (reducedMotion(options, view) || options.settleDuration === 0) {
      if (visualOwner?.visual) visualOwner.visual.style.transform = transform(visualOwner.baseTransform, endpoint);
      complete();
      return;
    }
    setState('settling');
    const motion = recipe || settleSpring(turbulencejs.turb, renderedPosition, endpoint, {
      baseTransform: visualOwner?.baseTransform,
      duration: options.settleDuration
    });
    try { playMotion(motion, complete); }
    catch (error) { options.onError?.(error, controller); complete(); }
  }

  function cancelDrag(reason = 'cancelled') {
    if (dragState === 'idle' || dragState === 'destroyed') return controller;
    validationToken += 1;
    validationController?.abort();
    if (activePointerId !== null) session.releasePointer(activePointerId);
    if (!visualOwner) {
      activeTarget = null;
      activePointerId = null;
      setState('idle');
      return controller;
    }
    options.onCancel?.(eventContext({ reason }));
    settle('cancelled', { x: 0, y: 0 }, options.motion?.cancel);
    return controller;
  }

  function teardownDrag() {
    if (destroyed) return;
    validationToken += 1;
    validationController?.abort();
    if (activePointerId !== null) session.releasePointer(activePointerId);
    if (visualOwner) finalize('destroyed');
    else {
      activeTarget = null;
      activePointerId = null;
      keyboard = false;
      origin = null;
      zones = [];
    }
    destroyed = true;
    dragState = 'destroyed';
  }

  function zoneEndpoint(entry) {
    if (!entry?.magnetic) return { ...position };
    return clampPosition({
      x: (entry.rect.left + entry.rect.width / 2 - (origin.geometry.rect.left + origin.geometry.rect.width / 2)) / origin.geometry.scaleX,
      y: (entry.rect.top + entry.rect.height / 2 - (origin.geometry.rect.top + origin.geometry.rect.height / 2)) / origin.geometry.scaleY
    }, bounds);
  }

  async function validateDrop(point) {
    if (!activeTarget || !visualOwner) return;
    setState('validating');
    stopFollow();
    const entry = dropZoneAt(zones, point, options.magneticDistance || 0);
    const token = ++validationToken;
    validationController?.abort();
    validationController = new AbortController();
    const payload = eventContext({ zone: entry?.zone || null, signal: validationController.signal });
    let valid = options.dropZones ? Boolean(entry) : true;
    try {
      if (options.canDrop) valid = await options.canDrop(payload);
      if (token !== validationToken || destroyed || validationController.signal.aborted) return;
      if (!valid) {
        options.onReject?.(payload);
        settle('rejected', { x: 0, y: 0 }, options.motion?.reject);
        return;
      }
      if (options.onDrop) await options.onDrop(payload);
      if (token !== validationToken || destroyed || validationController.signal.aborted) return;
      settle('committed', zoneEndpoint(entry), options.motion?.drop);
    } catch (error) {
      if (token !== validationToken || destroyed) return;
      options.onError?.(error, controller);
      options.onReject?.(eventContext({ zone: entry?.zone || null, error }));
      settle('rejected', { x: 0, y: 0 }, options.motion?.reject);
    }
  }

  function moveFromPointer(event) {
    if (!activeTarget?.isConnected) { cancelDrag('target-removed'); return; }
    const raw = pointerDelta(origin, event, view);
    const distance = Math.hypot(raw.x, raw.y);
    if (dragState === 'armed') {
      if (distance < Number(options.activationDistance ?? 3)) return;
      lift();
    }
    if (dragState !== 'lifted' && dragState !== 'dragging') return;
    setState('dragging');
    lastPoint = { x: event.clientX, y: event.clientY };
    let next = applyAxisGrid(raw, options);
    next = constrainPosition(next, bounds, Number(options.overscrollResistance ?? 0.2));
    velocity.update(next, Number(event.timeStamp || 0));
    applyPosition(next);
    if (options.autoScroll) {
      const edge = Number(options.autoScroll.edge || 36);
      const speed = Number(options.autoScroll.speed || 12);
      const x = event.clientX < edge ? -speed : event.clientX > view.innerWidth - edge ? speed : 0;
      const y = event.clientY < edge ? -speed : event.clientY > view.innerHeight - edge ? speed : 0;
      if (x || y) view.scrollBy?.({ left: x, top: y, behavior: 'auto' });
    }
  }

  function pointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false || dragState !== 'idle') return;
    session.setLastPointerType(event.pointerType || 'mouse');
    if (!begin(event.currentTarget, {
      armed: true, clientX: event.clientX, clientY: event.clientY, timeStamp: event.timeStamp
    })) return;
    activePointerId = event.pointerId;
    session.capturePointer(event.currentTarget, event.pointerId);
    event.preventDefault();
  }
  function pointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    moveFromPointer(event);
  }
  function pointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    const pointerId = activePointerId;
    activePointerId = null;
    session.releasePointer(pointerId);
    if (dragState === 'armed') { activeTarget = null; setState('idle'); return; }
    if (dragState === 'lifted' || dragState === 'dragging') validateDrop({ x: event.clientX, y: event.clientY });
  }
  function pointerCancel(event) {
    if (event.pointerId === activePointerId) cancelDrag(event.type);
  }

  function keyboardMove(key) {
    const step = Number(options.keyboardStep || 24);
    let next = { ...position };
    if (key === 'ArrowLeft') next.x -= step;
    if (key === 'ArrowRight') next.x += step;
    if (key === 'ArrowUp') next.y -= step;
    if (key === 'ArrowDown') next.y += step;
    if (key === 'Home') next = { x: bounds.minX, y: bounds.minY };
    if (key === 'End') next = { x: bounds.maxX, y: bounds.maxY };
    next = clampPosition(applyAxisGrid(next, options), bounds);
    position = next;
    lastPoint = {
      x: origin.geometry.rect.left + origin.geometry.rect.width / 2 + next.x * origin.geometry.scaleX,
      y: origin.geometry.rect.top + origin.geometry.rect.height / 2 + next.y * origin.geometry.scaleY
    };
    applyPosition(next);
    setState('dragging');
    announceDrag(options, 'move', eventContext({ key }));
  }

  function keyDown(event) {
    if (options.keyboard === false) return;
    const pickup = event.key === ' ' || event.key === 'Enter';
    if (dragState === 'idle' && pickup) {
      event.preventDefault();
      begin(event.currentTarget, { keyboard: true });
      return;
    }
    if (!keyboard || event.currentTarget !== activeTarget) return;
    if (pickup) { event.preventDefault(); validateDrop(lastPoint); return; }
    if (event.key === 'Escape') { event.preventDefault(); cancelDrag('escape'); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      keyboardMove(event.key);
    }
  }

  targets.forEach(target => {
    session.addTarget(target);
    session.ownStyle(target, ['touchAction', 'cursor']);
    target.style.touchAction = options.touchAction || 'none';
    target.style.cursor = options.cursor || 'grab';
    if (options.keyboard !== false && target.tabIndex < 0) {
      session.ownAttribute(target, 'tabindex');
      target.tabIndex = 0;
    }
    session.listen(target, 'pointerdown', pointerDown);
    session.listen(target, 'keydown', keyDown);
    session.listen(target, 'lostpointercapture', pointerCancel);
  });
  session.listen(root, 'pointermove', pointerMove);
  session.listen(root, 'pointerup', pointerUp);
  session.listen(root, 'pointercancel', pointerCancel);
  session.listen(root, 'keydown', event => { if (event.key === 'Escape' && !keyboard) cancelDrag('escape'); });
  session.listen(view, 'blur', () => cancelDrag('window-blur'));
  session.cleanup(teardownDrag);

  const controller = Object.create(session);
  Object.defineProperties(controller, {
    state: { get: () => dragState },
    sessionState: { get: () => session.state },
    diagnostics: { get: () => Object.freeze({
      ...session.diagnostics,
      dragState,
      activeTarget: activeTarget ? 1 : 0,
      activePointerId: activePointerId ?? -1,
      keyboard: keyboard ? 1 : 0,
      x: position.x,
      y: position.y,
      velocityX: velocity.value.x,
      velocityY: velocity.value.y,
      zoneCount: zones.length,
      validationToken,
      lastOutcome
    }) },
    cancel: { value: cancelDrag },
    destroy: { value: () => {
      if (destroyed) return controller;
      teardownDrag();
      session.destroy();
      return controller;
    } }
  });
  return controller;
}
