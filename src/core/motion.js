export const motionRoles = Object.freeze({
  feedbackFast: Object.freeze({ duration: 160, easing: 'quadOut', reducedMotion: 'instant' }),
  stateEnter: Object.freeze({ duration: 240, easing: 'cubicOut', reducedMotion: 'instant' }),
  stateExit: Object.freeze({ duration: 180, easing: 'cubicIn', reducedMotion: 'instant' }),
  spatialMove: Object.freeze({ duration: 320, easing: 'cubicInOut', reducedMotion: 'instant' }),
  emphasizedExplain: Object.freeze({ duration: 500, easing: 'backOut', reducedMotion: 'instant' }),
  gestureSettle: Object.freeze({ duration: 260, easing: 'quadOut', reducedMotion: 'instant' }),
  ambient: Object.freeze({ duration: 800, easing: 'linear', reducedMotion: 'instant' }),
  celebration: Object.freeze({ duration: 700, easing: 'elasticOut', reducedMotion: 'instant' })
});

export function motionOptions(role, options = {}, overrides = {}) {
  const recipe = motionRoles[role];
  if (!recipe) throw new RangeError(`Unknown motion role "${role}".`);
  return { duration: recipe.duration, easing: recipe.easing, role, ...overrides, ...options };
}

export default { roles: motionRoles, options: motionOptions };
