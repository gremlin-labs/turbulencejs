function transform(base, x, y) {
  return `translate3d(${x}px, ${y}px, 0px)${base && base !== 'none' ? ` ${base}` : ''}`;
}

export function createSpringSignal(turb, options = {}) {
  const value = { x: Number(options.x || 0), y: Number(options.y || 0), vx: Number(options.vx || 0), vy: Number(options.vy || 0) };
  const target = { x: value.x, y: value.y };
  const stiffness = Number(options.stiffness || 260);
  const damping = Number(options.damping || 28);
  const mass = Number(options.mass || 1);
  let previousTime = null;
  const recipe = turb.driver(context => ({
    ownedProperties: ['transform'],
    render(_progress, frame) {
      const elapsed = previousTime === null ? 16 : Math.max(0, Math.min(64, frame.time - previousTime));
      previousTime = frame.time;
      let remaining = elapsed / 1000;
      while (remaining > 0) {
        const step = Math.min(1 / 120, remaining);
        value.vx += ((target.x - value.x) * stiffness - value.vx * damping) / mass * step;
        value.vy += ((target.y - value.y) * stiffness - value.vy * damping) / mass * step;
        value.x += value.vx * step;
        value.y += value.vy * step;
        remaining -= step;
      }
      context.target.style.transform = transform(options.baseTransform, value.x, value.y);
      options.onUpdate?.(Object.freeze({ ...value }));
    },
    cancel() { previousTime = null; },
    diagnostics: { renderer: 'interaction-spring' }
  }), {
    duration: options.duration ?? 24 * 60 * 60 * 1000,
    easing: 'linear', reversible: false, seekable: false, finishable: false
  });
  return Object.freeze({
    recipe,
    retarget(x, y) { target.x = Number(x); target.y = Number(y); },
    set(x, y, vx = 0, vy = 0) { value.x = Number(x); value.y = Number(y); value.vx = Number(vx); value.vy = Number(vy); target.x = value.x; target.y = value.y; },
    get value() { return Object.freeze({ ...value }); },
    get target() { return Object.freeze({ ...target }); }
  });
}

export function settleSpring(turb, from, to, options = {}) {
  const duration = options.duration ?? 280;
  return turb.driver(context => ({
    ownedProperties: ['transform'],
    render(progress) {
      const decay = progress >= 1 ? 1 : 1 - Math.exp(-7 * progress) * Math.cos(10 * progress);
      const x = from.x + (to.x - from.x) * decay;
      const y = from.y + (to.y - from.y) * decay;
      context.target.style.transform = transform(options.baseTransform, x, y);
    }
  }), { duration, easing: 'linear' });
}
