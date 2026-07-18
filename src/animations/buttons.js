// src/animations/buttons.js - Enhanced with more delightful and cartoonish animations
import { animate } from '../core/engine';
import { effectLifecycle, effectOptions } from '../core/effect';
import { motionOptions } from '../core/motion';
// Assuming loading animations like pulse might be useful here too
import { pulse } from './loading';

function seededRandom(seed = 'turbulencejs-legacy-particles') {
  let state = 2166136261;
  for (const character of String(seed)) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function createAggregateParticles(element, options = {}, kind = 'burst') {
  const canvas = element.ownerDocument.createElement('canvas');
  const view = element.ownerDocument.defaultView;
  canvas.width = Math.max(1, view.innerWidth);
  canvas.height = Math.max(1, view.innerHeight);
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.turbulencejsAggregateParticles = '';
  Object.assign(canvas.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9999' });
  const context = canvas.getContext('2d');
  if (!context) return null;
  element.ownerDocument.body.append(canvas);
  const rect = element.getBoundingClientRect();
  const count = Math.max(1, Math.min(500, Number(options.particleCount || (kind === 'smoke' ? 25 : 20))));
  const random = seededRandom(options.seed);
  const particles = Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const distance = random() * (kind === 'smoke' ? 50 : 70) + 10;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - (kind === 'smoke' ? random() * 30 + 10 : 0),
      size: kind === 'smoke' ? random() * 15 + 8 : random() * 5 + 3,
      alpha: kind === 'smoke' ? random() * 0.5 + 0.4 : 1
    };
  });
  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.remove();
    canvas.width = 0;
    canvas.height = 0;
  };
  const controller = animate(canvas, { '--turbulencejs-particle-progress': [0, 1] }, {
    duration: options.duration || 500,
    easing: 'linear',
    onUpdate: (_canvas, progress) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const particle of particles) {
        context.globalAlpha = particle.alpha * (1 - progress);
        context.fillStyle = options.particleColor || (kind === 'smoke' ? 'rgb(200, 200, 200)' : 'rgb(255, 188, 80)');
        context.beginPath();
        context.arc(particle.x + particle.dx * progress, particle.y + particle.dy * progress, particle.size * (1 + progress * 0.5), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    },
    onComplete: cleanup,
    onCancel: cleanup
  });
  return controller;
}


/**
 * Creates a jelly effect for buttons using squash and stretch.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (e.g., intensity).
 * @returns {Object} Animation controller.
 */
export function jelly(element, options = {}) {
  const intensity = options.intensity || 1;
  return animate(element, {
    scale: [
        1,
        1.25 * intensity, // Stretch Y
        0.75 / intensity, // Squash Y
        1.15 * intensity, // Stretch Y slightly less
        0.95 / intensity, // Squash Y slightly less
        1.05 * intensity, // Small final stretch
        1
    ]
  }, {
    duration: options.duration || 800,
    easing: 'easeOutElastic(1, 0.7)', // Elastic easing works well for jelly
    ...options // Pass through onComplete etc.
  });
}

/**
 * Creates an explosive effect with particles.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (e.g., { particles: true, glow: true }).
 * @returns {Object} Animation controller.
 */
export function explode(element, options = {}) {
  const originalBoxShadow = element.style.boxShadow;
  const originalTransform = element.style.transform; // Store original transform
  const originalZIndex = element.style.zIndex;

  // Optional: Add anticipation - slight scale down before exploding
  const anticipation = animate(element, { scale: [1, 0.95] }, { duration: 100, easing: 'easeOut' });
  let particleTimer = null;
  let particleEffect = null;
  const cleanup = () => {
    anticipation.stop();
    if (particleTimer !== null) clearTimeout(particleTimer);
    particleEffect?.stop();
    particleEffect = null;
    element.style.boxShadow = originalBoxShadow;
    element.style.transform = originalTransform && originalTransform !== 'none' ? originalTransform : '';
    element.style.zIndex = originalZIndex;
  };
  const lifecycle = effectLifecycle(options, { complete: cleanup, cancel: cleanup });

  // Main explosion animation starting after anticipation
  const anim = animate(element, {
    scale: [0.95, 1.3 * (options.intensity || 1), 1], // Explode out, then settle back
    opacity: [1, 0.9, 1], // Optional fade during peak
    boxShadow: options.glow ? [
      '0 0 0 0 rgba(255,255,255,0.7)', // Start clear
      '0 0 10px 5px rgba(255,255,255,0.7)', // Initial glow burst
      '0 0 60px 30px rgba(255,255,255,0)', // Expanding glow fade out
      '0 0 0 0 rgba(255,255,255,0)' // End clear
    ] : undefined
  }, {
    ...options,
    delay: 100, // Start after anticipation
    duration: options.duration ?? 500,
    easing: 'easeOutExpo', // Expo creates a fast burst feel
    onComplete: lifecycle.onComplete,
    onCancel: lifecycle.onCancel
  });

  // Trigger particles slightly after the animation starts for better effect
  if (options.particles) {
    particleTimer = setTimeout(() => {
      particleTimer = null;
      particleEffect = createAggregateParticles(element, options, 'burst');
    }, 150);
  }

  return anim;
}

/**
 * Creates a crazy cartoon spring/boing button effect.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (intensity).
 * @returns {Object} Animation controller.
 */
export function springCrazy(element, options = {}) {
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  const intensity = options.intensity || 1;

  element.style.transformOrigin = '50% 100%'; // Anchor to bottom center for spring effect

  const anim = animate(element, {
    scaleX: [1, 0.8 / intensity, 1.3 * intensity, 0.7 / intensity, 1.2 * intensity, 0.9 / intensity, 1],
    scaleY: [1, 1.6 * intensity, 0.6 / intensity, 1.5 * intensity, 0.7 / intensity, 1.1 * intensity, 1],
    y: [0, -25 * intensity, 0, -15 * intensity, 0, -8 * intensity, 0] // Bounce effect vertical motion
  }, effectOptions(options, {
    duration: options.duration || 900,
    easing: 'easeOutElastic(1, 0.6)', // Elastic easing is key for the springiness
    onComplete: () => {
      element.style.transform = originalTransform; // Restore original transform
      element.style.transformOrigin = originalTransformOrigin; // Restore origin
    }
  }));

  return anim;
}

/**
 * Creates a vibrating button effect.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (e.g., intensity, repeat).
 * @returns {Object} Animation controller.
 */
export function vibrate(element, options = {}) {
  const intensity = options.intensity || 1;
  return animate(element, {
    // Use multiple keyframes for a more jittery vibration
    x: [0, -2 * intensity, 3 * intensity, -4 * intensity, 4 * intensity, -3 * intensity, 2 * intensity, 0],
    // Optional subtle rotation
    rotate: [0, 0.5 * intensity, -0.5 * intensity, 1 * intensity, -1 * intensity, 0.5 * intensity, -0.5 * intensity, 0]
  }, {
    duration: options.duration || 300, // Vibration is usually fast
    easing: 'linear', // Linear can feel more like mechanical vibration
    repeat: options.repeat, // Allow repeating vibration (e.g., 1 or 2 times)
    ...options
  });
}

/**
 * Creates a pulsating glow effect for buttons.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (glowColor, intensity, repeat, yoyo).
 * @returns {Object} Animation controller.
 */
export function glowPulse(element, options = {}) {
  const originalBoxShadow = element.style.boxShadow;
  const glowColor = options.glowColor || 'rgba(59, 130, 246, 0.6)'; // Default blue glow (Tailwind blue-500)
  const intensity = options.intensity || 1;
  const finalShadow = `0 0 ${20 * intensity}px ${10 * intensity}px ${glowColor}`;

  const anim = animate(element, {
    boxShadow: [
      originalBoxShadow || '0 0 0 0 rgba(0,0,0,0)', // Start from current or none
      finalShadow, // Peak glow
      originalBoxShadow || '0 0 0 0 rgba(0,0,0,0)' // End back at original
    ],
    scale: [1, 1.03 * intensity, 1] // Optional subtle scale pulse
  }, effectOptions(options, {
    duration: options.duration || 1500, // Pulse is usually slower
    easing: 'easeInOutQuad',
    repeat: options.repeat, // Allow infinite or fixed repeats
    yoyo: options.yoyo,     // Allow pulsing back and forth
    onComplete: () => {
      // Restore only if not infinitely repeating/yoyoing
      if (options.repeat !== -1 && !options.yoyo) {
         element.style.boxShadow = originalBoxShadow;
      }
    },
    onCancel: () => { element.style.boxShadow = originalBoxShadow; }
  }));

  return anim;
}

/**
 * Creates a 3D flip effect for buttons.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (direction: 'vertical' | 'horizontal').
 * @returns {Object} Animation controller.
 */
export function flip(element, options = {}) {
  const originalTransform = element.style.transform;
  const originalBackfaceVisibility = element.style.backfaceVisibility;
  const direction = options.direction || 'vertical';
  const rotateProperty = direction === 'vertical' ? 'rotateX' : 'rotateY';
  const props = {
      opacity: [1, 0.6, 0.6, 1] // Fade slightly in the middle for better 3D feel
  };
  // Animate 360 degrees to return to original orientation visually
  props[rotateProperty] = [0, 180, 360];

  element.style.backfaceVisibility = 'hidden'; // Prevent seeing the back during flip

  const anim = animate(element, props, effectOptions(options, {
    duration: options.duration || 700,
    easing: 'easeInOutExpo', // Expo easing for a more dynamic flip
    onComplete: () => {
      // Reset transform completely to avoid 360deg sticking in the computed style
      element.style.transform = originalTransform;
      element.style.backfaceVisibility = originalBackfaceVisibility;
    }
  }));

  return anim;
}

/**
 * Creates a morphing effect where the button changes border radius.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (sequence: array of border-radius values).
 * @returns {Object} Animation controller.
 */
export function morph(element, options = {}) {
  const originalBorderRadius = element.style.borderRadius;
  // More playful default sequence
  const morphSequence = options.sequence || [
    '10%', // Start slightly rounded
    '50%', // Circle/Pill
    '5% 50%', // Bean shape
    '50% 10%', // Another bean shape
    '8px', // Typical button radius
    originalBorderRadius || '10%' // End at original or default
  ];

  const anim = animate(element, {
    borderRadius: morphSequence
  }, effectOptions(options, {
    duration: options.duration || 1500, // Longer duration for morph
    easing: 'easeInOutQuad',
    repeat: options.repeat,
    yoyo: options.yoyo,
    onComplete: () => {
        // Restore only if not infinitely looping
        if (options.repeat !== -1 && !options.yoyo) {
             element.style.borderRadius = originalBorderRadius;
        }
    },
    onCancel: () => { element.style.borderRadius = originalBorderRadius; }
  }));

  return anim;
}

/**
 * Creates a shockwave effect radiating from the button.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (color, waveBorderWidth).
 * @returns {Object} Animation controller for the wave animation.
 */
export function shockwave(element, options = {}) {
  const originalPosition = element.style.position;
  // Check computed style for positioning
  const isPositioned = ['relative', 'absolute', 'fixed', 'sticky'].includes(window.getComputedStyle(element).position);

  if (!isPositioned) {
    element.style.position = 'relative'; // Temporarily add for wave positioning
  }

  const shockwaveEl = document.createElement('div');
  shockwaveEl.style.position = 'absolute';
  shockwaveEl.style.top = '50%';
  shockwaveEl.style.left = '50%';
  shockwaveEl.style.width = '100%'; // Start at element size
  shockwaveEl.style.height = '100%';
  shockwaveEl.style.borderRadius = '50%';
  shockwaveEl.style.border = `${options.waveBorderWidth || 2}px solid ${options.color || 'rgba(59, 130, 246, 0.7)'}`; // Blue default
  shockwaveEl.style.transform = 'translate(-50%, -50%) scale(0.8)'; // Center and slightly smaller
  shockwaveEl.style.opacity = '1';
  shockwaveEl.style.pointerEvents = 'none';
  shockwaveEl.style.zIndex = '-1'; // Place behind button content if needed

  element.appendChild(shockwaveEl);

  // Subtle button press effect (optional)
  animate(element, { scale: [1, 0.97, 1] }, { duration: 300, easing: 'easeOut' });

  // Animate shockwave expanding outwards
  const cleanup = () => {
    shockwaveEl.remove();
    if (!isPositioned) element.style.position = originalPosition;
  };
  const lifecycle = effectLifecycle(options, { complete: cleanup, cancel: cleanup });
  const waveAnim = animate(shockwaveEl, {
    scale: [0.8, (options.waveScale || 2.5)], // Expand outwards
    opacity: [1, 0] // Fade out
  }, {
    ...options,
    duration: options.duration ?? 600,
    easing: 'easeOutQuad', // Smooth expansion
    onComplete: () => lifecycle.onComplete(element),
    onCancel: () => lifecycle.onCancel(element)
  });

  return waveAnim; // Return the controller for the wave animation
}

/**
 * Creates a chaotic shake/distort effect. Use sparingly!
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (intensity, duration).
 * @returns {Object} Animation controller.
 */
export function chaos(element, options = {}) {
  const originalTransform = element.style.transform;
  const intensity = options.intensity || 1;
  const steps = 12; // More steps for smoother chaos
  const keyframes = { x: [0], y: [0], rotate: [0], scaleX: [1], scaleY: [1] };

  for (let i = 0; i < steps; i++) {
    keyframes.x.push((Math.random() * 15 - 7.5) * intensity);
    keyframes.y.push((Math.random() * 15 - 7.5) * intensity);
    keyframes.rotate.push((Math.random() * 15 - 7.5) * intensity);
    keyframes.scaleX.push(1 + (Math.random() * 0.3 - 0.15) * intensity);
    keyframes.scaleY.push(1 + (Math.random() * 0.3 - 0.15) * intensity);
  }
  // Ensure it ends back at the starting state
  keyframes.x.push(0);
  keyframes.y.push(0);
  keyframes.rotate.push(0);
  keyframes.scaleX.push(1);
  keyframes.scaleY.push(1);

  const anim = animate(element, keyframes, effectOptions(options, {
    duration: options.duration || 900, // Slightly longer for more chaos
    easing: 'easeInOutQuad', // Quad provides smooth transitions between chaotic states
    onComplete: () => {
      element.style.transform = originalTransform; // Restore original transform
    }
  }));

  return anim;
}


// --- Added Cartoonish Animations ---

/**
 * Cartoon Boing Effect - Exaggerated squash and stretch on click.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (intensity).
 * @returns {Object} Animation controller.
 */
export function boing(element, options = {}) {
    const originalTransform = element.style.transform;
    const originalTransformOrigin = element.style.transformOrigin;
    const intensity = options.intensity || 1.2; // Default to more exaggeration

    element.style.transformOrigin = '50% 100%'; // Anchor to bottom center

    // Anticipation: Slight lift and stretch upwards before squashing
    const anticipation = animate(element, {
        scaleY: [1, 1.1 * intensity],
        scaleX: [1, 0.9 / intensity],
        y: [0, -5 * intensity] // Move up slightly
    }, { duration: 120, easing: 'easeOutQuad' });

    // Main Boing: Squash down hard, then spring up past original, settle
    const anim = animate(element, {
        scaleY: [
            1.1 * intensity, // From anticipation end state
            0.4 / intensity, // Squash hard vertically
            1.4 * intensity, // Spring high vertically
            0.8 / intensity, // Bounce down (less squash)
            1.1 * intensity, // Bounce up slightly
            1              // Settle to normal scale
        ],
        scaleX: [
            0.9 / intensity, // From anticipation end state
            1.6 * intensity, // Squash wide horizontally
            0.7 / intensity, // Spring narrow horizontally
            1.2 * intensity, // Bounce wide
            0.9 / intensity, // Bounce narrow
            1              // Settle to normal scale
        ],
        y: [ // Match vertical movement to squash/stretch stages
            -5 * intensity, // From anticipation end state
            0,              // Hit "ground" when squashed
            -40 * intensity,// Spring high off the "ground"
            0,              // Hit "ground" again on bounce down
            -10 * intensity,// Smaller bounce up
            0               // Settle at original position
        ]
    }, effectOptions(options, {
        delay: 120, // Start after the anticipation finishes
        duration: options.duration || 800,
        easing: 'easeOutElastic(1, 0.5)', // Use elastic easing for the springy return
        onComplete: () => {
            anticipation.stop();
            element.style.transform = originalTransform;
            element.style.transformOrigin = originalTransformOrigin;
        },
        onCancel: () => {
            anticipation.stop();
            element.style.transform = originalTransform;
            element.style.transformOrigin = originalTransformOrigin;
        }
    }));
    return anim;
}

/**
 * Rubber Band Effect - Stretches on hover/mousedown, snaps back.
 * Designed to be triggered by event listeners (mouseenter/leave, mousedown/up).
 * @param {HTMLElement} element - The button element.
 * @param {'stretch' | 'snap'} state - The target state ('stretch' or 'snap' back).
 * @param {Object} options - Animation options (intensity, direction).
 * @returns {Object} Animation controller.
 */
export function rubberBand(element, state = 'stretch', options = {}) {
    const intensity = options.intensity || 0.3;
    const duration = options.duration || (state === 'stretch' ? 300 : 500); // Snap is slightly slower/elastic
    const easing = state === 'stretch' ? 'easeOutQuad' : 'easeOutElastic(1, 0.6)'; // Elastic snap back
    const direction = options.direction || 'horizontal'; // 'horizontal' or 'vertical'

    let props = {};
    // Define target properties for stretching
    if (state === 'stretch') {
        if (direction === 'horizontal') {
            props = { scaleX: 1 + intensity, scaleY: 1 - intensity * 0.5 };
        } else {
            props = { scaleX: 1 - intensity * 0.5, scaleY: 1 + intensity };
        }
    }
    // Define keyframes for snapping back with overshoot
    else { // snap back
        if (direction === 'horizontal') {
            // Keyframes: Stretched -> Overshoot opposite -> Overshoot slightly -> Settle
            props = { scaleX: [1 + intensity, 0.85, 1.1, 1], scaleY: [1 - intensity * 0.5, 1.1, 0.9, 1] };
        } else {
            props = { scaleX: [1 - intensity * 0.5, 1.1, 0.9, 1], scaleY: [1 + intensity, 0.85, 1.1, 1] };
        }
    }

    return animate(element, props, {
        duration: duration,
        easing: easing,
        ...options // Allow overriding onComplete etc.
    });
}


/**
 * Poof Effect - Button disappears in a puff of smoke particles.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (particleColor, particleCount).
 * @returns {Object} Animation controller for the button fade/scale animation.
 */
export function poof(element, options = {}) {
    const duration = options.duration || 500;
    let particleEffect = createAggregateParticles(element, { ...options, duration }, 'smoke');
    const cleanup = () => { particleEffect?.stop(); particleEffect = null; };
    const lifecycle = effectLifecycle(options, { cancel: cleanup });

    // Animate the button itself fading and shrinking slightly
    const buttonAnim = animate(element, {
        opacity: [1, 0],
        scale: [1, 0.7]
    }, {
        duration: duration * 0.6, // Button disappears faster than smoke clears
        ...options,
        easing: options.easing || 'easeInQuad',
        onComplete: lifecycle.onComplete,
        onCancel: lifecycle.onCancel
    });

    return buttonAnim; // Return the main button animation controller
}


// --- Standard Animations (Minor Enhancements) ---

/**
 * Creates a simple bounce effect for buttons.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options.
 * @returns {Object} Animation controller.
 */
export function bounce(element, options = {}) {
  return animate(element, {
    // Added a smaller secondary bounce for more life
    y: [0, -10, 0, -5, 0]
  }, {
    duration: options.duration || 500,
    easing: 'easeOutQuad', // Quad is smooth bounce
    ...options
  });
}

/**
 * Creates a shimmer/flash effect for buttons (using opacity flicker).
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options.
 * @returns {Object} Animation controller.
 */
export function shimmer(element, options = {}) {
    return animate(element, {
        // Flicker effect using multiple opacity keyframes
        opacity: [1, 0.6, 1, 0.8, 1]
    }, {
        duration: options.duration || 800,
        easing: 'easeInOutQuad',
        ...options
    });
    // Note: A better shimmer often uses a moving gradient pseudo-element.
}

/**
 * Creates a ripple effect originating from the center on click.
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options (color, rippleScale).
 * @returns {Object} Animation controller for the ripple.
 */
export function ripple(element, options = {}) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * (options.rippleScale || 1.5); // Control ripple size
    const originalPosition = element.style.position;
    const originalOverflow = element.style.overflow;
    const isPositioned = ['relative', 'absolute', 'fixed', 'sticky'].includes(window.getComputedStyle(element).position);

    if (!isPositioned) element.style.position = 'relative';
    element.style.overflow = 'hidden'; // Crucial to contain ripple

    const rippleEl = document.createElement('div');
    rippleEl.style.position = 'absolute';
    rippleEl.style.borderRadius = '50%';
    rippleEl.style.backgroundColor = options.color || 'rgba(255, 255, 255, 0.4)';
    rippleEl.style.width = `${size}px`; // Set final size
    rippleEl.style.height = `${size}px`;
    rippleEl.style.top = '50%'; // Center
    rippleEl.style.left = '50%';
    rippleEl.style.transform = 'translate(-50%, -50%) scale(0)'; // Start scaled down
    rippleEl.style.opacity = '1';
    rippleEl.style.pointerEvents = 'none';

    element.appendChild(rippleEl);

    const cleanup = () => {
        rippleEl.remove();
        if (!isPositioned) element.style.position = originalPosition;
        element.style.overflow = originalOverflow;
    };
    const lifecycle = effectLifecycle(options, { complete: cleanup, cancel: cleanup });
    const rippleAnim = animate(rippleEl, {
        scale: [0, 1], // Animate scale from 0 to 1
        opacity: [1, 0] // Fade out as it expands
    }, {
        ...options,
        duration: options.duration ?? 600,
        easing: 'easeOutQuad',
        onComplete: () => lifecycle.onComplete(element),
        onCancel: () => lifecycle.onCancel(element)
    });
    return rippleAnim;
}

/**
 * Creates a simple press/click effect (scale down and back).
 * @param {HTMLElement} element - The button element to animate.
 * @param {Object} options - Animation options.
 * @returns {Object} Animation controller.
 */
export function click(element, options = {}) {
  return animate(element, {
    scale: [1, 0.95, 1] // Scale down briefly, then back to normal
  }, motionOptions('feedbackFast', options));
}

// Export all button animations
export default {
  // Cartoonish / Delightful
  boing,
  jelly,
  explode,
  springCrazy,
  vibrate,
  glowPulse,
  flip,
  morph,
  shockwave,
  chaos,
  rubberBand,
  poof,
  // Standard / Utility
  pulse, // Re-exported from loading? (Consider if this belongs here or only in loading.js)
  bounce,
  shimmer,
  ripple,
  click,
};
