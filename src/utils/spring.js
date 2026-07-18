import { effectLifecycle } from '../core/effect';
import { getCurrentTransform, setTransformValue, transformToString } from './transform';

const DEFAULT_SPRING_CONFIG = {
  mass: 1,
  stiffness: 100,
  damping: 10,
  velocity: 0,
  precision: 0.01,
  maxDelta: 0.064,
  step: 1 / 120
};

export function createSpring(options = {}) {
  const config = { ...DEFAULT_SPRING_CONFIG, ...options };
  if (config.mass <= 0 || config.stiffness < 0 || config.damping < 0) {
    throw new RangeError('Spring mass must be positive; stiffness and damping cannot be negative.');
  }
  let position = 0;
  let velocity = config.velocity;
  let lastTime = null;

  return {
    reset(initialPosition = 0, initialVelocity = config.velocity) {
      position = initialPosition;
      velocity = initialVelocity;
      lastTime = null;
    },

    update(target, timestamp) {
      if (lastTime === null) {
        lastTime = timestamp;
        return { position, velocity, isSettled: Math.abs(position - target) < config.precision && Math.abs(velocity) < config.precision };
      }
      let remaining = Math.min(Math.max(0, (timestamp - lastTime) / 1000), config.maxDelta);
      lastTime = timestamp;
      while (remaining > 0) {
        const delta = Math.min(config.step, remaining);
        const acceleration = (-config.stiffness * (position - target) - config.damping * velocity) / config.mass;
        velocity += acceleration * delta;
        position += velocity * delta;
        remaining -= delta;
      }
      const isSettled = Math.abs(position - target) < config.precision && Math.abs(velocity) < config.precision;
      if (isSettled) {
        position = target;
        velocity = 0;
      }
      return { position, velocity, isSettled };
    }
  };
}

function reducedMotionRequested(options) {
  return options.respectReducedMotion !== false
    && typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function springTo(element, property, initialTarget, options = {}) {
  if (!element?.style) throw new TypeError('spring.to requires an element with a style object.');
  const transformProperty = { x: 'translateX', y: 'translateY', z: 'translateZ' }[property]
    || (['scale', 'scaleX', 'scaleY', 'scaleZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ'].includes(property) ? property : null);
  const transform = getCurrentTransform(element);
  const computed = typeof getComputedStyle === 'function' ? getComputedStyle(element) : element.style;
  const rawValue = transformProperty ? transform[transformProperty] : parseFloat(computed[property]);
  const startValue = Number.isFinite(rawValue) ? rawValue : 0;
  const unitMatch = String(computed[property] || '').match(/[-+\d.]+(.*)$/);
  const unit = options.unit ?? (['opacity', 'zIndex', 'fontWeight'].includes(property) ? '' : unitMatch?.[1] || 'px');
  const spring = createSpring(options);
  spring.reset(startValue, options.velocity);
  let target = Number(initialTarget);
  let requestId = null;
  let state = 'playing';
  const lifecycle = effectLifecycle(options);
  const reduce = reducedMotionRequested(options);

  const apply = value => {
    if (transformProperty) {
      setTransformValue(transform, transformProperty, value);
      element.style.transform = transformToString(transform);
    } else {
      element.style[property] = `${value}${unit}`;
    }
  };

  const frame = timestamp => {
    if (state !== 'playing') return;
    const result = spring.update(target, timestamp);
    apply(result.position);
    if (result.isSettled) {
      state = 'completed';
      requestId = null;
      lifecycle.onComplete(element);
    } else {
      requestId = requestAnimationFrame(frame);
    }
  };

  const controller = {
    stop() {
      if (state !== 'playing') return;
      state = 'cancelled';
      if (requestId !== null) cancelAnimationFrame(requestId);
      requestId = null;
      lifecycle.onCancel(element);
    },
    retarget(nextTarget) {
      target = Number(nextTarget);
      if (reduce) {
        apply(target);
        state = 'completed';
        return controller;
      }
      if (state !== 'playing') {
        state = 'playing';
        requestId = requestAnimationFrame(frame);
      }
      return controller;
    },
    get state() { return state; }
  };

  if (reduce) {
    apply(target);
    queueMicrotask(() => {
      if (state !== 'playing') return;
      state = 'completed';
      lifecycle.onComplete(element);
    });
  } else {
    requestId = requestAnimationFrame(frame);
  }
  return controller;
}

export const wobbly = (options = {}) => ({ mass: 1, stiffness: 180, damping: 12, ...options });
export const bouncy = (options = {}) => ({ mass: 1, stiffness: 220, damping: 8, ...options });
export const gentle = (options = {}) => ({ mass: 1, stiffness: 120, damping: 14, ...options });

export default { createSpring, springTo, wobbly, bouncy, gentle };
