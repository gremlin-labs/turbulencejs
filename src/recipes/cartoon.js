function directionVector(direction, amount) {
  switch (direction) {
    case 'left': return { x: -amount, y: 0 };
    case 'right': return { x: amount, y: 0 };
    case 'top': return { x: 0, y: -amount };
    case 'bottom': return { x: 0, y: amount };
    default: throw new RangeError(`Unknown direction "${direction}".`);
  }
}

function distanceFor(target, direction, requested) {
  if (typeof requested === 'function') return Number(requested(target, direction));
  if (Number.isFinite(Number(requested))) return Number(requested);
  const rect = target.getBoundingClientRect?.() || { width: 0, height: 0 };
  const viewport = direction === 'left' || direction === 'right'
    ? globalThis.innerWidth || globalThis.document?.documentElement?.clientWidth || 1024
    : globalThis.innerHeight || globalThis.document?.documentElement?.clientHeight || 768;
  return viewport + (direction === 'left' || direction === 'right' ? rect.width : rect.height) + 48;
}

function ordered(turb, parts, order) {
  const names = order || Object.keys(parts);
  const children = names.map(name => {
    if (!parts[name]) throw new RangeError(`Unknown recipe part "${name}".`);
    return parts[name];
  });
  return turb.sequence(...children);
}

export function createCartoonRecipes(turb) {
  function bubbleInParts(options = {}) {
    const intensity = Number(options.intensity ?? 1);
    const duration = Number(options.duration ?? 680);
    const from = directionVector(options.from || 'bottom', Number(options.rise ?? 22) * intensity);
    const startScale = Number(options.startScale ?? 0.82);
    const overshoot = Number(options.overshoot ?? 1.09) * intensity - (intensity - 1);
    return Object.freeze({
      appear: turb.track({ opacity: [0, 1] }, { role: 'stateEnter', duration: duration * 0.42 }),
      rise: turb.track({ x: [from.x, 0], y: [from.y, 0] }, { role: 'stateEnter', duration: duration * 0.58 }),
      expand: turb.track({ scale: [startScale, overshoot] }, { role: 'emphasizedExplain', duration: duration * 0.52 }),
      settle: turb.track({
        scale: [overshoot, 0.985, 1],
        x: [0, -2 * intensity, 1.2 * intensity, 0],
        rotate: [0, -0.8 * intensity, 0.55 * intensity, 0]
      }, { role: 'gestureSettle', duration: duration * 0.48 })
    });
  }

  function bubbleIn(options = {}) {
    const parts = bubbleInParts(options);
    let motion;
    if (options.order) motion = ordered(turb, parts, options.order);
    else if (options.mode === 'sequence') motion = turb.sequence(parts.appear, parts.rise, parts.expand, parts.settle);
    else motion = turb.parallel(parts.appear, parts.rise, turb.sequence(parts.expand, parts.settle));
    const origin = options.origin || '50% 100%';
    return turb.effect(({ target }) => {
      const previous = target.style.transformOrigin;
      target.style.transformOrigin = origin;
      return () => { target.style.transformOrigin = previous; };
    }, motion);
  }

  function skedaddleIn(options = {}) {
    const direction = options.from || 'left';
    const intensity = Number(options.intensity ?? 1);
    const duration = Number(options.duration ?? 720);
    return turb.each(target => {
      const vector = directionVector(direction, distanceFor(target, direction, options.distance));
      return turb.sequence(
        turb.track({
          opacity: [0, 1], x: [vector.x, -Math.sign(vector.x) * 22 * intensity || 0],
          y: [vector.y, -Math.sign(vector.y) * 22 * intensity || 0],
          scaleX: [0.86, 1.08], scaleY: [1.08, 0.94]
        }, { role: 'spatialMove', duration: duration * 0.62, easing: 'easeOutExpo' }),
        turb.track({
          x: [-Math.sign(vector.x) * 22 * intensity || 0, 6 * Math.sign(vector.x) || 0, 0],
          y: [-Math.sign(vector.y) * 22 * intensity || 0, 6 * Math.sign(vector.y) || 0, 0],
          rotate: [3 * Math.sign(vector.x || -vector.y) * intensity, -1.5 * intensity, 0],
          scaleX: [1.08, 0.98, 1], scaleY: [0.94, 1.02, 1]
        }, { role: 'gestureSettle', duration: duration * 0.38 })
      );
    });
  }

  function skedaddleOut(options = {}) {
    const direction = options.to || 'right';
    const intensity = Number(options.intensity ?? 1);
    const duration = Number(options.duration ?? 620);
    const cycles = Math.max(1, Math.floor(Number(options.cycles ?? 3)));
    return turb.each(target => {
      const vector = directionVector(direction, distanceFor(target, direction, options.distance));
      const horizontal = vector.x !== 0;
      const jitter = Array.from({ length: cycles * 2 + 1 }, (_, index) => index === cycles * 2 ? 0 : (index % 2 ? -1 : 1) * 3 * intensity);
      return turb.sequence(
        turb.track({
          x: horizontal ? jitter : 0,
          y: horizontal ? 0 : jitter,
          rotate: [0, -2 * Math.sign(vector.x || -vector.y) * intensity, 2 * intensity, 0],
          scaleX: [1, 1.08, 0.96, 1.1], scaleY: [1, 0.93, 1.04, 0.9]
        }, { role: 'emphasizedExplain', duration: duration * 0.42, easing: 'easeInOutSine' }),
        turb.track({
          x: [0, vector.x], y: [0, vector.y], opacity: [1, 0],
          scaleX: [1.1, 1.22], scaleY: [0.9, 0.76]
        }, { role: 'stateExit', duration: duration * 0.58, easing: 'easeInExpo' })
      );
    });
  }

  const skedaddle = Object.freeze({ in: skedaddleIn, out: skedaddleOut });
  return Object.freeze({ bubbleIn, bubbleInParts, skedaddle });
}
