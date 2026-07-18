// src/animations/toasts.js - Enhanced with more delightful and cartoonish animations
import { animate } from '../core/engine';
import { effectOptions } from '../core/effect';
import { motionOptions } from '../core/motion';
import { turb, script } from '../turbscript';
// Import path utilities directly to ensure they're available
import utils from '../utils';
// Make sure we have direct access to the path.follow function
import { followPath } from '../utils/path';

/**
 * Creates a slide-in animation for toast notifications with overshoot bounce.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (direction: 'right'|'left'|'bottom'|'top', intensity, reverse).
 * @returns {Object} Animation controller.
 */
export function slideInBounce(element, options = {}) {
  const isHide = options.reverse === true;
  const direction = options.direction || 'right';
  const intensity = options.intensity || 1;
  let startX = 0, startY = 0;
  // How far to overshoot the target position
  let overshootX = 0, overshootY = 0;

  // Determine start position and overshoot based on direction
  switch (direction) {
      case 'right': startX = 120 * intensity; overshootX = -20 * intensity; break;
      case 'left': startX = -120 * intensity; overshootX = 20 * intensity; break;
      case 'bottom': startY = 80 * intensity; overshootY = -15 * intensity; break;
      case 'top': startY = -80 * intensity; overshootY = 15 * intensity; break;
  }

  if (isHide) {
      // Hiding: Slide out in the original direction, maybe with slight acceleration
      return animate(element, {
          // Slide out further than it came in
          x: [0, startX * 1.2],
          y: [0, startY * 1.2],
          opacity: [1, 0]
      }, motionOptions('stateExit', options, { duration: 300, easing: 'easeInBack(1.5)' }));
  }

  // Showing: Slide in, overshoot, bounce back, settle
  return animate(element, {
    // Position keyframes: Start -> Overshoot -> Bounce Back 1 -> Bounce Back 2 -> Settle (0)
    x: [startX, overshootX, -overshootX * 0.4, overshootX * 0.2, 0],
    y: [startY, overshootY, -overshootY * 0.4, overshootY * 0.2, 0],
    opacity: [0, 1] // Simple fade in during slide
  }, motionOptions('stateEnter', options, { duration: 600, easing: 'easeOutExpo' }));
}

/**
 * Creates a zoom entrance for toast notifications with elastic bounce.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (origin, spin, reverse, intensity).
 * @returns {Object} Animation controller.
 */
export function zoomBurst(element, options = {}) {
  const originalTransformOrigin = element.style.transformOrigin;
  element.style.transformOrigin = options.origin || 'center center'; // Default center
  const isHide = options.reverse === true;
  const intensity = options.intensity || 1;
  // Punchy elastic easing, adjustable by intensity
  const easing = isHide ? 'easeInBack(1.7)' : `easeOutElastic(1, ${0.5 / intensity})`;

  const anim = animate(element, {
    // More exaggerated bounce for scale
    scale: isHide
        ? [1, 1.1 * intensity, 0.3 / intensity]
        : [0.3 / intensity, 1.15 * intensity, 0.9 / intensity, 1.05 * intensity, 1],
    opacity: isHide ? [1, 0] : [0, 1],
    // Optional spin effect
    rotate: options.spin ? (isHide
        ? [0, 10 * intensity, 0] // Rotate out
        : [options.spinAmount || (-20 * intensity), 5 * intensity, -2 * intensity, 0] // Spin in
    ) : undefined
  }, effectOptions(options, {
    duration: isHide ? 350 : 600,
    easing: easing,
    onComplete: () => {
      element.style.transformOrigin = originalTransformOrigin; // Restore origin
    }
  }));
  return anim;
}

/**
 * Creates a wiggle animation for toast notifications on arrival.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (distance, reverse, intensity).
 * @returns {Object} Animation controller.
 */
export function wiggleIn(element, options = {}) {
  const isHide = options.reverse === true;
  const distance = options.distance || 80; // Distance to slide in from initially
  const intensity = options.intensity || 1;

  if (isHide) {
    // Simple fade out for hiding a wiggled toast
    return animate(element, { opacity: [1, 0], scale: [1, 0.9] }, // Slight scale down on hide
      { duration: options.duration || 300, easing: 'easeOutQuad', ...options });
  }

  // Showing: Slide in quickly, then perform a rotation/translation wiggle
  return animate(element, {
    // Position: Slide in from distance, then small side-to-side wiggle
    x: [distance, 0, -6 * intensity, 4 * intensity, -2 * intensity, 0],
    // Rotation: Wiggle rotationally
    rotate: [0, -3 * intensity, 6 * intensity, -4 * intensity, 2 * intensity, 0],
    opacity: [0, 1] // Fade in during the slide/wiggle
  }, {
    duration: options.duration || 700,
    // Elastic easing for the final settle after the wiggle
    easing: `easeOutElastic(1, ${0.7 / intensity})`,
    ...options
  });
}

/**
 * Creates a heartbeat/pulse entry animation for toasts.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (reverse, intensity).
 * @returns {Object} Animation controller.
 */
export function heartbeat(element, options = {}) {
    const isHide = options.reverse === true;
    const intensity = options.intensity || 1;

    if (isHide) {
        // Hiding: Simple scale down and fade
        return animate(element, {
            scale: [1, 1.1, 0.7], // Slight expand then shrink
            opacity: [1, 0]
        }, { duration: options.duration || 300, easing: 'easeInQuad', ...options });
    }

    // Showing: Pulse scale effect
    return animate(element, {
        // Scale keyframes for heartbeat pulse
        scale: [0.9, 1.1 * intensity, 0.95 / intensity, 1.05 * intensity, 1],
        opacity: [0, 1] // Fade in during the pulse
    }, {
        duration: options.duration || 700,
        easing: 'easeInOutQuad', // Smooth pulse in/out
        ...options
    });
}

/**
 * Creates a 3D flip-in animation for toast notifications.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (direction: 'horizontal' | 'vertical', reverse).
 * @returns {Object} Animation controller.
 */
export function flipIn(element, options = {}) {
    const originalTransformOrigin = element.style.transformOrigin;
    const originalBackfaceVisibility = element.style.backfaceVisibility;
    const isHide = options.reverse === true;
    const direction = options.direction || 'horizontal'; // 'horizontal' or 'vertical'
    const axis = direction === 'vertical' ? 'X' : 'Y';
    const rotateProp = `rotate${axis}`;

    // Set origin and backface visibility for the flip
    element.style.transformOrigin = 'center center';
    element.style.backfaceVisibility = 'hidden';

    const props = {
        opacity: isHide ? [1, 0] : [0, 1],
        // Add subtle scale for better 3D perception
        scale: isHide ? [1, 0.8] : [0.8, 1]
    };
    // Rotate 90 degrees in or out
    props[rotateProp] = isHide ? [0, 90] : [-90, 0];

    const anim = animate(element, props, effectOptions(options, {
        duration: isHide ? 400 : 600,
        // Back easing provides a nice anticipation/overshoot feel
        easing: isHide ? 'easeInBack(1.5)' : 'easeOutBack(1.5)',
        onComplete: () => {
            // Restore original styles after animation
            element.style.transformOrigin = originalTransformOrigin;
            element.style.backfaceVisibility = originalBackfaceVisibility;
        }
    }));
    return anim;
}

/**
 * Creates a "drop and bounce" animation for toast notifications.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (reverse, intensity, dropHeight).
 * @returns {Object} Animation controller.
 */
export function dropBounce(element, options = {}) {
    const isHide = options.reverse === true;
    const intensity = options.intensity || 1;
    const dropHeight = options.dropHeight || 150; // Height to drop from

    if (isHide) {
        // Hiding: Bounce up slightly then shoot upwards
        return animate(element, {
            // Position: Small bounce up, then fly off screen
            y: [0, -10 * intensity, dropHeight * 1.2],
            opacity: [1, 0.5, 0], // Fade out
            // Scale slightly as it bounces up
            scale: [1, 1.05 * intensity, 0.8]
        }, { duration: options.duration || 400, easing: 'easeInQuad', ...options });
    }

    // Showing: Drop from height, bounce multiple times, settle
    return animate(element, {
        // Position keyframes for dropping and bouncing
        y: [-dropHeight, 20 * intensity, -10 * intensity, 5 * intensity, 0],
        opacity: [0, 1], // Fade in during the drop
        // Optional subtle scale bounce on impact
        scale: [0.9, 1.02, 0.98, 1.01, 1]
    }, {
        duration: options.duration || 800,
        // Bounce easing is perfect for this effect
        easing: 'easeOutBounce',
        ...options
    });
}


/**
 * Creates a "tada" celebration animation (like on success).
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (intensity, fadeIn).
 * @returns {Object} Animation controller.
 */
export function tada(element, options = {}) {
    const intensity = options.intensity || 1;
  return animate(element, {
    // Scale sequence for a shaking/pulsing effect
    scale: [1, 0.9, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1],
    // Rotation sequence for side-to-side shaking
    rotate: [0, -3*intensity, 3*intensity, -3*intensity, 3*intensity, -3*intensity, 3*intensity, -3*intensity, 3*intensity, 0],
    // Optional fade in if triggered on appearance
    opacity: options.fadeIn ? [0, 1] : 1
  }, {
    duration: options.duration || 900, // Tada is usually a bit longer
    easing: 'easeInOutQuad', // Smooth shake
    ...options
  });
}


// --- Added Cartoonish Animations ---

/**
 * Slinky In - Expands like a slinky toy from top/bottom or left/right.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (reverse, direction: 'vertical'|'horizontal').
 * @returns {Object} Animation controller.
 */
export function slinkyIn(element, options = {}) {
    const isHide = options.reverse === true;
    const direction = options.direction || 'vertical'; // 'vertical' or 'horizontal'
    // Determine which scale property and origin to use
    const scaleProp = direction === 'vertical' ? 'scaleY' : 'scaleX';
    const origin = direction === 'vertical' ? 'top center' : 'left center';
    const originalTransformOrigin = element.style.transformOrigin;

    element.style.transformOrigin = origin; // Set origin for scaling effect

    if (isHide) {
        // Hiding: Simple scale back to 0 along the chosen axis
        return animate(element, {
            opacity: [1, 0],
            [scaleProp]: [1, 0] // Scale out
        }, effectOptions(options, {
            duration: options.duration || 400,
            easing: 'easeInQuad',
            onComplete: () => {
                element.style.transformOrigin = originalTransformOrigin; // Restore origin
            }
        }));
    }

    // Showing: Expand, over-expand, bounce back like a slinky
    const anim = animate(element, {
        opacity: [0, 1], // Fade in during expansion
        // Slinky expansion bounce sequence for scale
        [scaleProp]: [0, 1.2, 0.9, 1.05, 1]
    }, effectOptions(options, {
        duration: options.duration || 700,
        // Elastic easing suits the slinky springiness
        easing: 'easeOutElastic(1, 0.6)',
        onComplete: () => {
            element.style.transformOrigin = originalTransformOrigin; // Restore origin
        }
    }));
    return anim;
}

/**
 * Pop and Wiggle - Toast pops into view then wiggles briefly.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (reverse, intensity).
 * @returns {Object} One performance controller that owns the complete sequence.
 */
export function popAndWiggle(element, options = {}) {
    const isHide = options.reverse === true;
    const intensity = options.intensity || 1;
    const duration = options.duration || 700;
    const playOptions = {
        respectReducedMotion: options.respectReducedMotion !== false,
        onStart: options.onStart,
        onComplete: options.onComplete,
        onCancel: options.onCancel
    };

    if (isHide) {
        return script(turb.track({
            opacity: [1, 0],
            scale: [1, 0.7]
        }, { role: 'stateExit', duration: duration * 0.5, easing: options.easing || 'easeInBack(1.5)' })).play(element, playOptions);
    }

    const recipe = turb.parallel(
        turb.track({ opacity: [0, 1], scale: [0.5, 1.1, 1] }, {
            role: 'emphasizedExplain', duration: duration * 0.4, easing: 'easeOutBack(2)'
        }),
        turb.at(duration * 0.3, turb.track({
            rotate: [0, -4 * intensity, 4 * intensity, -2 * intensity, 2 * intensity, 0],
            x: [0, 3 * intensity, -3 * intensity, intensity, -intensity, 0]
        }, { role: 'gestureSettle', duration: duration * 0.7, easing: options.easing || 'easeInOutSine' }))
    );
    return script(recipe).play(element, playOptions);
}

/**
 * Arc In - Toast flies in along a curved path.
 * @param {HTMLElement} element - The toast element to animate.
 * @param {Object} options - Animation options (reverse, pathString, rotate, easing).
 * @returns {Object} Animation controller from followPath or basic fallback.
 */
export function arcIn(element, options = {}) {
    const isHide = options.reverse === true;
    
    // If hiding, use a simple animation instead of path animation
    if (isHide) {
        return animate(element, {
            opacity: [1, 0],
            scale: [1, 0.7]
        }, {
            duration: options.duration || 400,
            easing: 'easeInQuad',
            ...options
        });
    }
    
    try {
        // Ensure the element is positioned but invisible at first
        element.style.opacity = '0';
        element.style.transform = 'scale(0.7)';
        
        // Define a default path with safer calculations
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
        
        // Create a more dramatic default path if one isn't provided
        const startX = viewportWidth + 50;
        const startY = viewportHeight - 100;
        const endX = viewportWidth - 300;
        const endY = viewportHeight - 150;
        const controlX = (startX + endX) / 2;
        const controlY = endY - 300; // High arc for visibility
        
        const defaultPath = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
        const pathString = options.pathString || defaultPath;
        
        console.log("Using path:", pathString);
        
        // Important: Make sure element is properly positioned before starting
        // Position to the start of the path
        const parsedPath = utils.path.parsePath(pathString);
        if (parsedPath && parsedPath.length > 0 && parsedPath[0].start) {
            // Get starting position from path
            const startPoint = parsedPath[0].start;
            console.log("Starting position:", startPoint);
            
            // Position element at the start of the path
            element.style.position = 'fixed'; // Ensure we're using fixed positioning
            element.style.transform = `translate(${startPoint.x}px, ${startPoint.y}px) scale(0.7)`;
        }
        
        // Fade in element as we follow the path
        animate(element, {
            opacity: [0, 1],
            scale: [0.7, 1]
        }, {
            duration: options.duration || 1500,
            easing: options.easing || 'easeOutQuad',
        });
        
        // Use followPath for movement
        return followPath(element, pathString, {
            duration: options.duration || 1500,
            easing: options.easing || 'easeOutQuad',
            rotate: options.rotate === undefined ? true : options.rotate,
            offset: options.offset || { x: 0, y: 0 },
            rotateOffset: options.rotateOffset || 0,
            onComplete: options.onComplete,
        });
    } catch (error) {
        console.warn("arcIn animation error, using fallback:", error);
        // Fallback to a simpler animation
        return slideInBounce(element, options);
    }
}

// Export all toast animations
export default {
  // Enhanced existing
  slideInBounce,
  zoomBurst,
  wiggleIn,
  heartbeat,
  flipIn,
  dropBounce,
  tada,
  // New Cartoonish
  slinkyIn,
  popAndWiggle,
  arcIn,
  // Removed springyWipe due to complexity/potential issues
};
