export const profileNames = Object.freeze([
  'quiet', 'waterfall', 'sproing', 'slam', 'glitch', 'zeroGravity',
  'bubbleIn', 'skedaddle', 'card3D', 'cinematicSlide'
]);
export const intensityNames = Object.freeze(['restrained', 'expressive', 'wild']);

const intensityScale = Object.freeze({ restrained: 0.72, expressive: 1, wild: 1.35 });
const timing = (reduced, value) => reduced ? 0 : value;

export const motionProfiles = Object.freeze({
  quiet: Object.freeze({
    label: 'Quiet', description: 'Crisp, low-key product motion.',
    code: "turb.stagger(16, turb.track({ opacity: [0, 1], y: [8, 0] }))",
    program({ turb, scale, reduced }) {
      return turb.stagger(timing(reduced, 16), turb.track({ opacity: [0, 1], y: [8 * scale, 0] }, {
        role: 'stateEnter', duration: timing(reduced, 220), easing: 'easeOutCubic'
      }));
    }
  }),
  waterfall: Object.freeze({
    label: 'Waterfall', description: 'Content pours down the dashboard in sequence.',
    code: "turb.stagger(42, turb.track({ opacity: [0, 1], y: [-26, 0] }))",
    program({ turb, scale, reduced }) {
      return turb.stagger(timing(reduced, 42), turb.track({ opacity: [0, 1], y: [-26 * scale, 0], scale: [0.975, 1] }, {
        role: 'spatialMove', duration: timing(reduced, 430), easing: 'easeOutCubic'
      }));
    }
  }),
  sproing: Object.freeze({
    label: 'Sproing', description: 'Elastic entrances with cheerful overshoot.',
    code: "turb.stagger(36, turb.track({ scale: [0.72, 1.08, 0.97, 1] }))",
    program({ turb, scale, reduced }) {
      return turb.stagger(timing(reduced, 36), turb.track({
        opacity: [0, 1], y: [28 * scale, -5 * scale, 0], scale: [0.72, 1.08 + (scale - 1) * 0.06, 0.97, 1]
      }, { role: 'emphasizedExplain', duration: timing(reduced, 650), easing: 'easeOutElastic(1, 0.62)' }));
    }
  }),
  slam: Object.freeze({
    label: 'Slam', description: 'Panels arrive with asymmetric impact.',
    code: "turb.stagger(28, turb.each((_target, index) => index % 2 ? slamRight : slamLeft))",
    program({ turb, scale, reduced }) {
      return turb.stagger(timing(reduced, 28), (_target, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        return turb.track({
          opacity: [0, 1], x: [direction * 46 * scale, direction * -3, 0],
          rotate: [direction * 2.8 * scale, direction * -0.5, 0], scale: [1.035, 0.992, 1]
        }, { role: 'emphasizedExplain', duration: timing(reduced, 460), easing: 'easeOutExpo' });
      });
    }
  }),
  glitch: Object.freeze({
    label: 'Glitch', description: 'A brief signal break, then perfect alignment.',
    code: "turb.stagger(22, turb.each((_target, index) => glitch(index % 2)))",
    program({ turb, scale, reduced }) {
      return turb.stagger(timing(reduced, 22), (_target, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        return turb.track({
          opacity: [0, 0.7, 0.35, 1], x: [direction * 11 * scale, direction * -8, direction * 3, 0],
          skewX: [direction * 4 * scale, direction * -2, 0]
        }, { role: 'feedbackFast', duration: timing(reduced, 330), easing: 'easeOutQuad' });
      });
    }
  }),
  zeroGravity: Object.freeze({
    label: 'Zero Gravity', description: 'Panels drift in and settle from open space.',
    code: "turb.stagger(48, turb.each((_target, index) => drift(index % 2)))",
    program({ turb, scale, reduced }) {
      return turb.stagger(timing(reduced, 48), (_target, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        return turb.track({
          opacity: [0, 1], y: [38 * scale, -10 * scale, 0], x: [direction * 12 * scale, 0],
          rotate: [direction * 3.2 * scale, 0], scale: [0.96, 1.01, 1]
        }, { role: 'spatialMove', duration: timing(reduced, 760), easing: 'easeOutBack(1.35)' });
      });
    }
  }),
  bubbleIn: Object.freeze({
    label: 'Bubble In', description: 'Buoyant capital with a soft cartoon settle.',
    code: "turb.stagger(38, bubbleIn({ mode: 'together', intensity }))",
    program({ turb, packs, scale, reduced }) {
      return turb.stagger(timing(reduced, 38), packs.cartoon.bubbleIn({
        intensity: scale, duration: timing(reduced, 680), mode: 'together'
      }));
    }
  }),
  skedaddle: Object.freeze({
    label: 'Skedaddle', description: 'The portfolio gets cartoon legs and arrives running.',
    code: "turb.stagger(32, (_target, index) => skedaddle.in({ from: index % 2 ? 'right' : 'left' }))",
    program({ turb, packs, scale, reduced }) {
      return turb.stagger(timing(reduced, 32), (_target, index) => packs.cartoon.skedaddle.in({
        from: index % 2 ? 'right' : 'left', intensity: scale, duration: timing(reduced, 720)
      }));
    }
  }),
  card3D: Object.freeze({
    label: '3D Card', description: 'Holdings pitch through space and land flat.',
    code: "turb.stagger(45, turb.choose([card3D.in({ from: 'northWest' }), card3D.in({ from: 'southEast' })]))",
    program({ turb, packs, scale, reduced }) {
      return turb.stagger(timing(reduced, 45), turb.choose([
        packs.cinematic.card3D.in({ from: 'northWest', intensity: scale, duration: timing(reduced, 720) }),
        packs.cinematic.card3D.in({ from: 'southEast', intensity: scale, duration: timing(reduced, 720) })
      ]));
    }
  }),
  cinematicSlide: Object.freeze({
    label: 'Cinematic Slide', description: 'A linear wipe worthy of an earnings trailer.',
    code: "turb.stagger(34, turb.cycle(cinematicSlide.in({ anchor: 'left' }), cinematicSlide.in({ anchor: 'top' })))",
    program({ turb, packs, reduced }) {
      return turb.stagger(timing(reduced, 34), turb.cycle(
        packs.cinematic.cinematicSlide.in({ anchor: 'left', duration: timing(reduced, 520) }),
        packs.cinematic.cinematicSlide.in({ anchor: 'top', duration: timing(reduced, 520) })
      ));
    }
  })
});

export function parseMotionQuery(search = '') {
  const params = new URLSearchParams(search);
  const requestedProfile = params.get('motion');
  const requestedIntensity = params.get('intensity');
  return {
    profile: profileNames.includes(requestedProfile) ? requestedProfile : 'quiet',
    intensity: intensityNames.includes(requestedIntensity) ? requestedIntensity : 'expressive'
  };
}

export function isReducedMotion(matchMedia = globalThis.matchMedia) {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createMotionRunner(turbulencejs, environment = {}) {
  const root = environment.root || document;
  const packs = environment.packs || {};
  const location = environment.location || globalThis.location;
  const history = environment.history || globalThis.history;
  const dispatchTarget = environment.dispatchTarget || root;
  const now = environment.now || (() => globalThis.performance?.now?.() ?? Date.now());
  let state = parseMotionQuery(location?.search || '');
  let performance = null;

  function activeCount() {
    return performance?.diagnostics?.activeOwnedWork > 0 ? 1 : 0;
  }

  function publishDiagnostics() {
    if (root.documentElement) root.documentElement.dataset.motionControllers = String(activeCount());
  }

  function stop() {
    performance?.stop();
    publishDiagnostics();
  }

  function restore() {
    performance?.reset();
    performance = null;
    publishDiagnostics();
  }

  function emit() {
    if (typeof dispatchTarget?.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
    dispatchTarget.dispatchEvent(new CustomEvent('turbulencejs:profilechange', { detail: getState() }));
  }

  function syncUrl() {
    if (!location || !history?.replaceState) return;
    const url = new URL(location.href);
    url.searchParams.set('motion', state.profile);
    url.searchParams.set('intensity', state.intensity);
    history.replaceState({}, '', url);
  }

  function run() {
    const startedAt = now();
    stop();
    restore();
    const profile = motionProfiles[state.profile];
    const reduced = root.documentElement?.dataset.reducedMotion === 'true';
    const program = profile.program({
      turb: turbulencejs.turb, packs, scale: intensityScale[state.intensity], reduced
    });
    performance = turbulencejs.script(program).play(
      () => Array.from(root.querySelectorAll('[data-motion-item]')),
      { seed: `turbshire:${state.profile}:${state.intensity}`, onComplete: publishDiagnostics, onCancel: publishDiagnostics }
    );
    publishDiagnostics();
    if (root.documentElement) {
      root.documentElement.dataset.motionSetupMs = (now() - startedAt).toFixed(2);
      root.documentElement.dataset.motionSeed = performance.seed;
    }
    emit();
    return [performance];
  }

  function setProfile(profile, { replay = true } = {}) {
    state = { ...state, profile: profileNames.includes(profile) ? profile : 'quiet' };
    syncUrl();
    if (replay) run(); else emit();
    return getState();
  }

  function setIntensity(intensity, { replay = true } = {}) {
    state = { ...state, intensity: intensityNames.includes(intensity) ? intensity : 'expressive' };
    syncUrl();
    if (replay) run(); else emit();
    return getState();
  }

  function reset() {
    state = { profile: 'quiet', intensity: 'expressive' };
    syncUrl();
    return run();
  }

  function getState() {
    return { ...state, activeControllers: activeCount(), seed: performance?.seed || null };
  }

  return { run, stop, restore, reset, setProfile, setIntensity, getState };
}
