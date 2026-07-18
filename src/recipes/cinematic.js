const pitchMap = Object.freeze({
  top: { x: -64, y: 0 }, bottom: { x: 64, y: 0 },
  left: { x: 0, y: 64 }, right: { x: 0, y: -64 },
  northWest: { x: -48, y: 48 }, northEast: { x: -48, y: -48 },
  southWest: { x: 48, y: 48 }, southEast: { x: 48, y: -48 }
});

const origins = Object.freeze({
  top: '50% 0%', bottom: '50% 100%', left: '0% 50%', right: '100% 50%',
  topLeft: '0% 0%', topRight: '100% 0%', bottomLeft: '0% 100%', bottomRight: '100% 100%',
  center: '50% 50%'
});

function setup3D(target, options) {
  const host = options.host?.(target) || options.host || target.parentElement;
  const previous = {
    perspective: host?.style.perspective,
    origin: target.style.transformOrigin,
    backface: target.style.backfaceVisibility
  };
  if (host) host.style.perspective = `${Number(options.perspective ?? 1000)}px`;
  target.style.transformOrigin = options.origin || '50% 50%';
  target.style.backfaceVisibility = 'hidden';
  return () => {
    if (host) host.style.perspective = previous.perspective || '';
    target.style.transformOrigin = previous.origin || '';
    target.style.backfaceVisibility = previous.backface || '';
  };
}

export function createCinematicRecipes(turb) {
  function cardIn(options = {}) {
    const direction = options.from || 'left';
    const pitch = pitchMap[direction];
    if (!pitch) throw new RangeError(`Unknown 3D direction "${direction}".`);
    const intensity = Number(options.intensity ?? 1);
    const duration = Number(options.duration ?? 720);
    const motion = turb.track({
      opacity: [0, 1],
      rotateX: [pitch.x * intensity, -4 * Math.sign(pitch.x), 0],
      rotateY: [pitch.y * intensity, -4 * Math.sign(pitch.y), 0],
      z: [Number(options.depth ?? -90) * intensity, 8 * intensity, 0],
      scale: [0.9, 1.025, 1]
    }, { role: 'emphasizedExplain', duration, easing: options.easing || 'easeOutBack(1.35)' });
    return turb.effect(({ target }) => setup3D(target, options), motion);
  }

  function cardOut(options = {}) {
    const direction = options.to || 'right';
    const pitch = pitchMap[direction];
    if (!pitch) throw new RangeError(`Unknown 3D direction "${direction}".`);
    const intensity = Number(options.intensity ?? 1);
    const duration = Number(options.duration ?? 520);
    const spin = Number(options.spin ?? 1);
    const motion = turb.track({
      opacity: [1, 0],
      rotateX: [0, pitch.x * intensity + 180 * spin * Math.sign(pitch.x || 1)],
      rotateY: [0, pitch.y * intensity + 180 * spin * Math.sign(pitch.y || 1)],
      z: [0, Number(options.depth ?? -140) * intensity], scale: [1, 0.72]
    }, { role: 'stateExit', duration, easing: options.easing || 'easeInExpo' });
    return turb.effect(({ target }) => setup3D(target, options), motion);
  }

  function slide(direction, options = {}) {
    const anchor = options.anchor || (direction === 'in' ? 'left' : 'right');
    const origin = origins[anchor];
    if (!origin) throw new RangeError(`Unknown cinematic anchor "${anchor}".`);
    const horizontal = ['left', 'right'].includes(anchor) || anchor.includes('Left') || anchor.includes('Right');
    const panel = turb.track({
      opacity: direction === 'in' ? [0, 1] : [1, 0],
      scaleX: horizontal ? (direction === 'in' ? [0.001, 1] : [1, 0.001]) : 1,
      scaleY: horizontal ? 1 : (direction === 'in' ? [0.001, 1] : [1, 0.001])
    }, { role: direction === 'in' ? 'spatialMove' : 'stateExit', duration: Number(options.duration ?? 520), easing: 'linear' });
    let motion = panel;
    const contentDuration = Number(options.contentDuration ?? 240);
    if (options.content === 'after') {
      motion = direction === 'in'
        ? turb.sequence(panel, turb.slot(options.contentSlot || 'content', turb.track({ opacity: [0, 1], y: [8, 0] }, { role: 'stateEnter', duration: contentDuration })))
        : turb.sequence(turb.slot(options.contentSlot || 'content', turb.track({ opacity: [1, 0] }, { role: 'stateExit', duration: contentDuration })), panel);
    } else if (options.content && turb.isTurb(options.content)) {
      const content = turb.slot(options.contentSlot || 'content', options.content);
      motion = direction === 'in' ? turb.sequence(panel, content) : turb.sequence(content, panel);
    }
    return turb.effect(({ target }) => {
      const previous = target.style.transformOrigin;
      target.style.transformOrigin = origin;
      return () => { target.style.transformOrigin = previous || ''; };
    }, motion);
  }

  const card3D = Object.freeze({ in: cardIn, out: cardOut });
  const cinematicSlide = Object.freeze({
    in: options => slide('in', options),
    out: options => slide('out', options)
  });
  return Object.freeze({ card3D, cinematicSlide });
}
