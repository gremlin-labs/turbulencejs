export function createExtremeRecipes(_turb, cartoon, cinematic) {
  return Object.freeze({
    impactBubble: (options = {}) => cartoon.bubbleIn({ intensity: 1.7, rise: 54, overshoot: 1.2, duration: 900, ...options }),
    panicSkedaddle: Object.freeze({
      in: (options = {}) => cartoon.skedaddle.in({ intensity: 1.5, duration: 820, ...options }),
      out: (options = {}) => cartoon.skedaddle.out({ intensity: 1.6, cycles: 5, duration: 760, ...options })
    }),
    spinAway: (options = {}) => cinematic.card3D.out({ intensity: 1.5, spin: 2, duration: 720, ...options })
  });
}
