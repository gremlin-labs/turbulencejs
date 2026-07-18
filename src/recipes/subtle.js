export function createSubtleRecipes(turb, cartoon, cinematic) {
  return Object.freeze({
    softReveal: (options = {}) => cartoon.bubbleIn({ mode: 'together', intensity: 0.45, rise: 10, overshoot: 1.025, duration: 320, ...options }),
    quietSlide: (options = {}) => cinematic.cinematicSlide.in({ duration: 280, content: 'with', ...options }),
    gentleSettle: (options = {}) => turb.track({ opacity: [0.7, 1], y: [6, 0], scale: [0.985, 1] }, { role: 'stateEnter', ...options })
  });
}
