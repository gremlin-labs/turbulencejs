import { createEasing } from './easing';
import { applyProperties, parseProperties } from './values';
import { browserScheduler } from './scheduler';

const activeAnimations = new Map();
const controllerDefinitions = new WeakMap();
let animationIdCounter = 0;
let loopRequest = null;

const defaults = {
  duration: 300,
  easing: 'easeInOut',
  delay: 0,
  repeat: 0,
  yoyo: false,
  autoplay: true,
  respectReducedMotion: true,
  onStart: null,
  onUpdate: null,
  onComplete: null,
  onCancel: null
};

function reducedMotionRequested(options = {}) {
  if (typeof options.reducedMotion === 'boolean') return options.reducedMotion;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureLoop() {
  if (loopRequest === null && [...activeAnimations.values()].some(animation => animation.state === 'playing')) {
    loopRequest = browserScheduler.schedule(animationLoop);
  }
}

function stopLoopIfIdle() {
  if (loopRequest !== null && ![...activeAnimations.values()].some(animation => animation.state === 'playing')) {
    browserScheduler.cancel(loopRequest);
    loopRequest = null;
  }
}

function finalProgress(animation) {
  const lastIteration = animation.config.repeat === -1 ? 0 : animation.config.repeat;
  return animation.config.yoyo && lastIteration % 2 === 1 ? 0 : 1;
}

function callOnce(animation, kind) {
  const flag = `${kind}Called`;
  if (animation[flag]) return;
  animation[flag] = true;
  const callback = animation.config[kind];
  if (typeof callback === 'function') callback(animation.element);
}

function complete(animation) {
  if (animation.state === 'completed' || animation.state === 'cancelled') return;
  animation.state = 'completed';
  activeAnimations.delete(animation.id);
  stopLoopIfIdle();
  callOnce(animation, 'onComplete');
}

function cancel(animation) {
  if (!animation || animation.state === 'completed' || animation.state === 'cancelled') return;
  animation.state = 'cancelled';
  activeAnimations.delete(animation.id);
  stopLoopIfIdle();
  callOnce(animation, 'onCancel');
}

function render(animation, elapsed) {
  const { duration, repeat, yoyo } = animation.config;
  const cycles = repeat === -1 ? Infinity : repeat + 1;
  const totalDuration = duration * cycles;
  const completed = repeat !== -1 && elapsed >= totalDuration;
  const boundedElapsed = completed ? totalDuration : Math.max(0, elapsed);
  const iteration = completed
    ? Math.max(0, cycles - 1)
    : Math.floor(boundedElapsed / duration);
  const iterationProgress = completed ? 1 : (boundedElapsed % duration) / duration;
  let directedProgress = yoyo && iteration % 2 === 1 ? 1 - iterationProgress : iterationProgress;
  if (animation.reversed) directedProgress = 1 - directedProgress;
  const easedProgress = animation.easing(directedProgress);

  applyProperties(animation.element, animation.definition, easedProgress);
  if (typeof animation.config.onUpdate === 'function') {
    animation.config.onUpdate(animation.element, easedProgress, iteration);
  }
  return completed;
}

function animationLoop(timestamp) {
  loopRequest = null;
  for (const animation of [...activeAnimations.values()]) {
    if (animation.state !== 'playing') continue;
    const elapsed = timestamp - animation.startTime - animation.pausedDuration - animation.config.delay;
    if (elapsed < 0) continue;
    if (!animation.started) {
      animation.started = true;
      callOnce(animation, 'onStart');
    }
    if (render(animation, elapsed)) complete(animation);
  }
  ensureLoop();
}

function play(animation) {
  if (!animation || animation.state === 'completed' || animation.state === 'cancelled' || animation.state === 'playing') return;
  if (animation.state === 'paused') return resumeAnimation(animation);
  animation.state = 'playing';
  animation.startTime = browserScheduler.now();
  ensureLoop();
}

function pauseAnimation(animation) {
  if (!animation || animation.state !== 'playing') return;
  animation.state = 'paused';
  animation.pausedAt = browserScheduler.now();
}

function resumeAnimation(animation) {
  if (!animation || animation.state !== 'paused') return;
  animation.pausedDuration += browserScheduler.now() - animation.pausedAt;
  animation.pausedAt = null;
  animation.state = 'playing';
  ensureLoop();
}

function reverseAnimation(animation) {
  if (!animation || animation.state === 'completed' || animation.state === 'cancelled') return;
  if (animation.config.duration === 0) return;
  const now = animation.state === 'paused' ? animation.pausedAt : browserScheduler.now();
  const elapsed = Math.max(0, now - animation.startTime - animation.pausedDuration - animation.config.delay);
  const finiteDuration = animation.config.repeat === -1
    ? null
    : animation.config.duration * (animation.config.repeat + 1);
  const mirroredElapsed = finiteDuration === null
    ? Math.floor(elapsed / animation.config.duration) * animation.config.duration
      + animation.config.duration - (elapsed % animation.config.duration)
    : Math.max(0, finiteDuration - Math.min(elapsed, finiteDuration));
  animation.startTime = now - animation.pausedDuration - animation.config.delay - mirroredElapsed;
  animation.reversed = !animation.reversed;
  if (animation.state === 'idle') play(animation);
  if (animation.state === 'paused') resumeAnimation(animation);
}

function settleImmediately(animation) {
  animation.started = true;
  animation.state = 'settling';
  const progress = animation.reversed ? 1 - finalProgress(animation) : finalProgress(animation);
  applyProperties(animation.element, animation.definition, progress);
  queueMicrotask(() => {
    if (animation.state !== 'settling') return;
    callOnce(animation, 'onStart');
    if (typeof animation.config.onUpdate === 'function') {
      animation.config.onUpdate(animation.element, progress, animation.config.repeat === -1 ? 0 : animation.config.repeat);
    }
    complete(animation);
  });
}

export function animate(element, properties, options = {}) {
  if (!element || !element.style) throw new TypeError('animate requires an element with a style object.');
  const config = {
    ...defaults,
    ...options,
    duration: Math.max(0, Number(options.duration ?? defaults.duration)),
    delay: Math.max(0, Number(options.delay ?? defaults.delay)),
    repeat: options.repeat === -1 ? -1 : Math.max(0, Math.floor(Number(options.repeat ?? defaults.repeat)))
  };
  const animation = {
    id: ++animationIdCounter,
    element,
    config,
    definition: parseProperties(element, properties),
    easing: createEasing(config.easing),
    state: 'idle',
    startTime: null,
    pausedAt: null,
    pausedDuration: 0,
    reversed: false,
    started: false,
    onStartCalled: false,
    onCompleteCalled: false,
    onCancelCalled: false
  };

  const controller = {
    id: animation.id,
    play: () => play(animation),
    pause: () => pauseAnimation(animation),
    resume: () => resumeAnimation(animation),
    stop: () => cancel(animation),
    reverse: () => reverseAnimation(animation),
    get state() { return animation.state; }
  };
  controllerDefinitions.set(controller, animation);
  activeAnimations.set(animation.id, animation);

  if (config.autoplay === false) {
    return controller;
  }
  if (config.duration === 0 || (config.respectReducedMotion !== false && reducedMotionRequested(config))) {
    settleImmediately(animation);
  } else {
    play(animation);
  }
  return controller;
}

// Internal timeline bridge. It deliberately avoids exposing mutable engine state publicly.
export function takeAnimationDefinition(controller) {
  const animation = controllerDefinitions.get(controller);
  if (!animation) return null;
  const settledBeforeAdoption = animation.state === 'settling';
  activeAnimations.delete(animation.id);
  animation.state = 'adopted';
  stopLoopIfIdle();
  if (settledBeforeAdoption) applyProperties(animation.element, animation.definition, 0);
  return {
    element: animation.element,
    config: { ...animation.config },
    definition: animation.definition,
    easing: animation.easing
  };
}

export function stop(id) {
  cancel(activeAnimations.get(id));
}

export function pause(id) {
  pauseAnimation(activeAnimations.get(id));
}

export function resume(id) {
  resumeAnimation(activeAnimations.get(id));
}

export default { animate, pause, resume, stop };
