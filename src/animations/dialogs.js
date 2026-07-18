// src/animations/dialogs.js - Enhanced with more delightful and cartoonish animations
import { animate } from '../core/engine';
import { effectLifecycle, effectOptions } from '../core/effect';
import { motionOptions } from '../core/motion';

// --- Helper Functions ---

/** Helper to manage perspective on parent */
function setPerspective(element, value) {
    const parent = element.parentElement;
    if (parent) {
        // Store original perspective using a data attribute for robustness
        parent.dataset.originalPerspective = parent.style.perspective || 'none';
        parent.style.perspective = value;
        // Optional: Add perspective-origin if needed
        // parent.style.perspectiveOrigin = 'center center';
    }
}

/** Helper to restore original perspective on parent */
function restorePerspective(element) {
    const parent = element.parentElement;
    if (parent && parent.dataset.originalPerspective !== undefined) {
        parent.style.perspective = parent.dataset.originalPerspective === 'none' ? '' : parent.dataset.originalPerspective;
        delete parent.dataset.originalPerspective; // Clean up dataset
    }
}

// --- Animation Functions ---

/**
 * Creates an elastic zoom animation for dialogs/modals based on specific requirements.
 * Show: Fades in (0->1), Scales (0->1.2->0.8->1)
 * Hide: Scales (1->1.2->0), Fades out (1->0)
 * @param {HTMLElement} element - The dialog element to animate (modal-content).
 * @param {Object} options - Animation options (origin, reverse, duration).
 * @returns {Object} Animation controller.
 */
export function elasticZoom(element, options = {}) {
  const originalTransformOrigin = element.style.transformOrigin;
  const originalTransform = element.style.transform;
  const originalOpacity = element.style.opacity;
  element.style.transformOrigin = options.origin || 'center center';

  const isHide = options.reverse === true;
  const recipe = motionOptions(isHide ? 'stateExit' : 'stateEnter', {}, {
    duration: isHide ? 450 : 800,
    easing: isHide ? 'easeOutQuad' : 'easeOutElastic(1, 0.6)'
  });
  // Adjusted default durations - hide can be slightly faster
  const duration = options.duration ?? recipe.duration;

  // Define animation properties based on show/hide state and specific requirements
  const props = {
    scale: isHide
      // Hide: Start at 1, overshoot to 1.2, shrink rapidly to near 0 (0.01 for safety)
      ? [1, 1.2, 0.01]
      // Show: Start near 0, overshoot to 1.2, undershoot to 0.8, settle at 1
      : [0.01, 1.2, 0.8, 1], // Start at 0.01 instead of 0 to avoid potential glitches

    opacity: isHide
      // Hide: Fade out smoothly across the entire animation (scale 1 -> 1.2 -> 0.01)
      ? [1, 0]
      // Show: Fade in smoothly across the entire animation (scale 0.01 -> 1.2 -> 0.8 -> 1)
      : [0, 1]
  };

  // Create and return the animation
  const anim = animate(element, props, effectOptions(options, {
    duration: duration,
    // Use appropriate easing for each direction
    easing: options.easing ?? recipe.easing,
    onComplete: () => {
      // Restore original transform origin when animation completes
      element.style.transformOrigin = originalTransformOrigin;

      // Ensure final opacity and potentially scale state is correctly set
      if (isHide) {
          element.style.opacity = '0';
          // Setting scale to 0 can sometimes cause rendering issues,
          // display:none is usually handled by the modal logic after animation.
          // If needed: element.style.transform = 'scale(0.01)';
      } else {
          element.style.opacity = '1';
          element.style.transform = 'scale(1)'; // Ensure it ends exactly at scale 1
      }

    },
    onCancel: () => {
      element.style.transformOrigin = originalTransformOrigin;
      element.style.transform = originalTransform;
      element.style.opacity = originalOpacity;
    }
  }));

  return anim;
}


/**
 * Creates a dramatic zoom animation for dialogs/modals with overshoot (Alternative Version).
 * @param {HTMLElement} element - The dialog element to animate (modal-content).
 * @param {Object} options - Animation options (origin, rotateStart, reverse, intensity).
 * @returns {Object} Animation controller.
 */
export function explosiveZoom(element, options = {}) {
  const originalTransformOrigin = element.style.transformOrigin;
  element.style.transformOrigin = options.origin || 'center center';
  const isHide = options.reverse === true;
  const intensity = options.intensity || 1;
  // Punchier elastic easing
  const easing = isHide ? 'easeInQuint' : `easeOutElastic(1, ${0.6 / intensity})`;

  const anim = animate(element, {
    // More exaggerated scale sequence
    scale: isHide
        ? [1, 1.1 * intensity, 0.3 / intensity]
        : [0.3 / intensity, 1.15 * intensity, 0.95 / intensity, 1.05 * intensity, 1],
    opacity: isHide ? [1, 1, 0] : [0, 1],
    // Optional rotation with more kick
    rotate: options.rotate ? (isHide
        ? [0, 5 * intensity, 0]
        : [options.rotateStart || (-15 * intensity), 5 * intensity, -2 * intensity, 0]
    ) : undefined
  }, effectOptions(options, {
    duration: isHide ? 400 : 700,
    easing: easing,
    onComplete: () => {
      element.style.transformOrigin = originalTransformOrigin; // Restore origin
    }
  }));
  return anim;
}

/**
 * Creates a slam effect where the dialog crashes into view, optionally shaking the screen.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (direction, shake:boolean|HTMLElement, reverse, intensity).
 * @returns {Object} Animation controller.
 */
export function slam(element, options = {}) {
  const isHide = options.reverse === true;
  const direction = options.direction || 'top'; // 'top', 'bottom', 'left', 'right'
  const intensity = options.intensity || 1;
  let fromX = 0, fromY = 0, fromScale = 1.5 * intensity, fromRotate = 0;

  // Determine starting position and rotation based on direction
  switch (direction) {
    case 'top': fromY = -250 * intensity; fromRotate = 5 * intensity; break;
    case 'bottom': fromY = 250 * intensity; fromRotate = -5 * intensity; break;
    case 'left': fromX = -300 * intensity; fromRotate = -8 * intensity; break;
    case 'right': fromX = 300 * intensity; fromRotate = 8 * intensity; break;
  }

  const animProps = {
    opacity: isHide ? [1, 0.5, 0] : [0, 1],
    // More pronounced bounce back on scale, position, and rotation
    scale: isHide
        ? [1, 0.9, fromScale * 1.1] // Pull back then shoot away further
        : [fromScale, 0.97, 1.03, 0.98, 1.01, 1], // Slam, bounce back sequence
    x: isHide
        ? [0, fromX * 0.3, fromX * 1.2] // Shoot away further
        : [fromX, 0, 10 * intensity, -5 * intensity, 2 * intensity, 0], // Slam, bounce sequence
    y: isHide
        ? [0, fromY * 0.3, fromY * 1.2] // Shoot away further
        : [fromY, 0, -10 * intensity, 5 * intensity, -2 * intensity, 0], // Slam, bounce sequence
    rotate: isHide
        ? [0, fromRotate * 0.5, fromRotate * 1.2] // Rotate away further
        : [fromRotate, 0, -3 * intensity, 2 * intensity, -1 * intensity, 0] // Slam, rotate bounce sequence
  };

  // Screen shake effect - target body or a specific container
  if (options.shake && !isHide) {
    // Allow passing a specific element to shake, otherwise default to body
    const shakeTarget = (options.shake instanceof HTMLElement) ? options.shake : document.body;
    if (shakeTarget) {
        animate(shakeTarget, {
            x: [0, -8 * intensity, 6 * intensity, -4 * intensity, 2 * intensity, 0],
            y: [0, 5 * intensity, -4 * intensity, 3 * intensity, -1 * intensity, 0]
        }, {
            duration: 400,
            delay: 100, // Shake occurs just after the main slam impact
            easing: 'easeOutQuad'
        });
    }
  }

  return animate(element, animProps, {
    duration: isHide ? 400 : 700, // Slightly longer entrance for bounce
    // Use Expo for fast slam, Back for pulling away feel on hide
    easing: isHide ? 'easeInBack(2)' : 'easeOutExpo',
    ...options
  });
}

/**
 * Creates a 3D flip animation for dialogs.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (direction, perspective, reverse).
 * @returns {Object} Animation controller.
 */
export function flip3D(element, options = {}) {
    const isHide = options.reverse === true;
    const direction = options.direction || 'horizontal'; // 'horizontal' or 'vertical'
    const perspective = options.perspective || '1200px';
    const axis = direction === 'horizontal' ? 'Y' : 'X';
    const rotateProperty = `rotate${axis}`;
    const originalTransformOrigin = element.style.transformOrigin;
    const originalBackfaceVisibility = element.style.backfaceVisibility;

    setPerspective(element, perspective); // Apply perspective to parent
    element.style.transformOrigin = 'center center'; // Flip around center
    element.style.backfaceVisibility = 'hidden'; // Essential for a clean flip

    const props = {
        opacity: isHide ? [1, 0.5, 0] : [0, 0.5, 1], // Fade in/out
        // Add slight scale change for more pronounced 3D effect
        scale: isHide ? [1, 0.8] : [0.8, 1]
    };
    // Rotate 90 degrees in/out with overshoot/anticipation
    props[rotateProperty] = isHide
        ? [0, 60 * (options.intensity || 1), 90] // Overshoot slightly when hiding
        : [-90, -20 * (options.intensity || 1), 0]; // Anticipate slightly when showing

    const anim = animate(element, props, effectOptions(options, {
        duration: isHide ? 500 : 700,
        // Back easing provides the overshoot/anticipation feel
        easing: isHide ? 'easeInBack(1.5)' : 'easeOutBack(1.5)',
        onComplete: () => {
            restorePerspective(element); // Restore parent perspective
            element.style.transformOrigin = originalTransformOrigin;
            element.style.backfaceVisibility = originalBackfaceVisibility;
        }
    }));
    return anim;
}

/**
 * Creates a dramatic swipe animation (like dismissing a card).
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (direction, distance, rotate, reverse).
 * @returns {Object} Animation controller.
 */
export function swipe(element, options = {}) {
  const isHide = options.reverse === true;
  const direction = options.direction || 'right';
  // Allow customizing distance, default to a large portion of viewport width
  const distance = options.distance || window.innerWidth * 0.8;
  // Allow disabling or customizing rotation intensity
  const rotateIntensity = options.rotate === false ? 0 : (options.rotate || 15);

  let targetX = 0, targetY = 0, targetRotate = 0;

  // Determine target position/rotation based on direction
  switch (direction) {
    case 'top': targetY = -distance; targetRotate = rotateIntensity * 0.5; break;
    case 'bottom': targetY = distance; targetRotate = -rotateIntensity * 0.5; break;
    case 'left': targetX = -distance; targetRotate = -rotateIntensity; break;
    case 'right': default: targetX = distance; targetRotate = rotateIntensity; break;
  }

  // Define animation properties for showing and hiding
  const props = {
    opacity: isHide ? [1, 0] : [0, 1], // Fade out/in
    // Animate from/to the target position/rotation
    x: isHide ? [0, targetX] : [targetX, 0],
    y: isHide ? [0, targetY] : [targetY, 0],
    rotate: isHide ? [0, targetRotate] : [targetRotate, 0]
  };

  return animate(element, props, {
    duration: isHide ? 400 : 600, // Faster hide, slower entrance
    // Quintic easing provides smooth acceleration/deceleration, good for swipes
    easing: isHide ? 'easeInCubic' : 'easeOutQuint',
    ...options
  });
}

/**
 * Creates a bouncy entrance animation (like dropping a cartoon object).
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (intensity, reverse).
 * @returns {Object} Animation controller.
 */
export function bounceIn(element, options = {}) {
  const isHide = options.reverse === true;
  const intensity = options.intensity || 1;

  if (isHide) {
    // Hiding: Scale up slightly (anticipation) then shrink away quickly
    return animate(element, {
      scale: [1, 1.2 * intensity, 0.3], // Exaggerated scale out
      opacity: [1, 0.8, 0] // Fade out
    }, {
      duration: options.duration || 400,
      easing: 'easeInBack(2)', // Pull back sharply before disappearing
      ...options
    });
  }

  // Showing: Start small, bounce past 1, then settle
  return animate(element, {
    // Bounce sequence for scale
    scale: [0.3, 1.1 * intensity, 0.9 / intensity, 1.05 * intensity, 0.98 / intensity, 1],
    opacity: [0, 1] // Simple fade in during the bounce
  }, {
    duration: options.duration || 800,
    // Custom elastic easing for a good bounce feel
    easing: `easeOutElastic(1, ${0.6 / intensity})`,
    ...options
  });
}

/**
 * Creates a helicopter-like rotating entrance.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (reverse, intensity).
 * @returns {Object} Animation controller.
 */
export function helicopterIn(element, options = {}) {
  const isHide = options.reverse === true;
  const intensity = options.intensity || 1;
  // More dramatic rotation angles
  const rotations = isHide
    ? [0, -45 * intensity, -120 * intensity]
    : [-120 * intensity, 20 * intensity, 0];
  // Scale from/to zero
  const scale = isHide ? [1, 0.8, 0] : [0, 1.1, 1];

  return animate(element, {
    rotate: rotations,
    scale: scale,
    opacity: isHide ? [1, 0.5, 0] : [0, 0.5, 1] // Fade during rotation
  }, {
    duration: isHide ? 500 : 700,
    // Back easing gives a nice overshoot/anticipation to the rotation
    easing: isHide ? 'easeInBack(1.5)' : 'easeOutBack(1.5)',
    ...options
  });
}

/**
 * Creates a glitchy digital entrance/exit for dialogs.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (reverse, duration).
 * @returns {Object} Animation controller for the main opacity/scale animation.
 */
export function glitchIn(element, options = {}) {
    const isHide = options.reverse === true;
    const originalTransform = element.style.transform;
    const originalFilter = element.style.filter;
    const duration = options.duration || 900; // Longer duration for glitch effect
    let glitchIntervalId = null; // To store interval ID
    const glitchTimeoutIds = new Set();

    // Function to apply a random glitch effect frame
    const applyGlitch = (intensity = 1) => {
        const xOffset = (Math.random() * 20 - 10) * intensity;
        const yOffset = (Math.random() * 20 - 10) * intensity;
        const skewX = (Math.random() * 10 - 5) * intensity;
        const blur = Math.random() * 3 * intensity;
        const saturate = 100 + Math.random() * 100 * intensity;
        // Ensure transform doesn't overwrite main animation scale/position
        const baseTransform = element.style.transform.replace(/translate.*?\)|skewX.*?\)/g, '').trim();
        element.style.transform = `${baseTransform} translate(${xOffset}px, ${yOffset}px) skewX(${skewX}deg)`;
        element.style.filter = `blur(${blur}px) saturate(${saturate}%) brightness(1.1)`;
    };

    // Function to clear glitch effects and restore base style for the current frame
    const clearGlitchTemporarily = () => {
        // Reset only the glitch-specific parts, keep base transform from main animation
        const baseTransform = element.style.transform.replace(/translate.*?\)|skewX.*?\)/g, '').trim();
        element.style.transform = baseTransform || ''; // Keep main animation transforms
        element.style.filter = ''; // Clear filter
    };

    // Function to fully restore original styles after completion/stop
    const restoreOriginalStyles = () => {
        clearInterval(glitchIntervalId); // Ensure interval is cleared
        glitchTimeoutIds.forEach(clearTimeout);
        glitchTimeoutIds.clear();
        element.style.transform = originalTransform;
        element.style.filter = originalFilter;
        // Opacity is usually handled by the final state of the animation or display:none
    };
    const scheduleClear = delay => {
        const timeoutId = setTimeout(() => {
            glitchTimeoutIds.delete(timeoutId);
            clearGlitchTemporarily();
        }, delay);
        glitchTimeoutIds.add(timeoutId);
    };
    const lifecycle = effectLifecycle(options, { complete: restoreOriginalStyles, cancel: restoreOriginalStyles });

    // --- Hide Animation ---
    if (isHide) {
        const glitchOut = animate(element, {
            // Stepped fade out to enhance glitch feel
            opacity: [1, 0.8, 0.8, 0.5, 0.5, 0.2, 0.2, 0]
        }, {
            ...options,
            duration: duration,
            easing: 'linear', // Linear fade, glitches provide the effect
            onComplete: lifecycle.onComplete,
            onCancel: lifecycle.onCancel
        });

        // Apply glitches periodically during the hide animation
        const intervalCount = 8;
        let count = 0;
        glitchIntervalId = setInterval(() => {
            // Stop if animation completed early or interval finished
            if (count >= intervalCount || glitchOut.state !== 'playing') {
                 clearInterval(glitchIntervalId);
                 return;
            }
            const intensity = 1 - (count / intervalCount); // Decrease glitch intensity over time
            applyGlitch(intensity);
            // Briefly reset styles between glitches to let opacity fade show
            scheduleClear((duration / intervalCount) * 0.4);
            count++;
        }, duration / intervalCount);

        return glitchOut; // Return controller for the main fade animation

    }
    // --- Show Animation ---
    else {
        // Set initial glitched state (fully transparent but glitched for first frame)
        element.style.opacity = '0';
        applyGlitch(1.5); // Start heavily glitched

        const anim = animate(element, {
            opacity: [0, 1], // Smooth fade in
            scale: [0.9, 1] // Optional subtle scale in
        }, {
            ...options,
            duration: duration,
            easing: 'easeOutQuad', // Smooth fade-in curve
            onComplete: lifecycle.onComplete,
            onCancel: lifecycle.onCancel
        });

        // Apply glitches periodically during the entrance animation
        const intervalCount = 10;
        let count = 0;
        glitchIntervalId = setInterval(() => {
            // Stop if animation completed early or interval finished
            if (count >= intervalCount || anim.state !== 'playing') {
                 clearInterval(glitchIntervalId);
                 // Don't restore styles here, let onComplete handle the final state
                 return;
            }
             const intensity = 1.5 - (1.5 * (count / intervalCount)); // Decrease intensity
             applyGlitch(intensity);
             // Briefly reset styles between glitches to allow main animation to progress
             scheduleClear((duration / intervalCount) * 0.4);
             count++;
        }, duration / intervalCount);

        return anim; // Return controller for the main show animation
    }
}

// --- Added Cartoonish Animations ---

/**
 * Paper Fold/Unfold Animation (Simplified).
 * Animates rotation and scale to simulate folding. A true multi-fold is complex.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (reverse, folds, direction, perspective).
 * @returns {Object} Animation controller.
 */
export function paperFold(element, options = {}) {
    const isHide = options.reverse === true;
    const folds = Math.max(1, options.folds || 1); // Number of folds (1 or 2 typical)
    const direction = options.direction || 'vertical'; // 'vertical' or 'horizontal'
    const perspective = options.perspective || '1500px';
    const duration = options.duration || 800;
    const originalTransform = element.style.transform;
    const originalTransformOrigin = element.style.transformOrigin;
    const originalBackfaceVisibility = element.style.backfaceVisibility;
    // Note: Overflow needs careful handling for true fold effect, simplified here

    setPerspective(element, perspective);
    element.style.backfaceVisibility = 'hidden';

    const axis = direction === 'vertical' ? 'X' : 'Y';
    const rotateProp = `rotate${axis}`;
    // Scale in the direction perpendicular to the fold axis
    const scaleProp = direction === 'vertical' ? 'scaleY' : 'scaleX';
    // Set origin based on fold direction
    element.style.transformOrigin = direction === 'vertical' ? 'top center' : 'left center';

    const props = {
        opacity: isHide ? [1, 0] : [0, 1]
    };
    // Rotation simulates the folding action (90 deg per fold)
    props[rotateProp] = isHide ? [0, 90 * folds] : [90 * folds, 0];
    // Scaling simulates the shrinking/growing size during fold/unfold
    // Target scale is 1 / (number of panels = folds + 1)
    props[scaleProp] = isHide ? [1, 1 / (folds + 1)] : [1 / (folds + 1), 1];


    const anim = animate(element, props, effectOptions(options, {
        duration: duration,
        easing: isHide ? 'easeInCubic' : 'easeOutCubic', // Smooth cubic easing
        onComplete: () => {
            restorePerspective(element); // Restore parent perspective
            // Reset styles carefully
            element.style.transform = originalTransform;
            element.style.transformOrigin = originalTransformOrigin;
            element.style.backfaceVisibility = originalBackfaceVisibility;
        }
    }));

    return anim;
}

/**
 * Cartoon Run In - Element zips in from off-screen, skids past target, wobbles back.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (reverse, fromDirection, distance).
 * @returns {Object} Animation controller.
 */
export function cartoonRunIn(element, options = {}) {
    const isHide = options.reverse === true;
    const fromDirection = options.fromDirection || 'left'; // 'left', 'right', 'top', 'bottom'
    const distance = options.distance || window.innerWidth; // Distance to run in from
    const duration = options.duration || 900;
    const intensity = options.intensity || 1;

    let startX = 0, startY = 0, startRotate = 0;
    let overshootX = 0, overshootY = 0; // How far to skid past the center

    // Determine starting position and overshoot based on direction
    switch(fromDirection) {
        case 'left': startX = -distance; overshootX = 30 * intensity; startRotate = -5 * intensity; break;
        case 'right': startX = distance; overshootX = -30 * intensity; startRotate = 5 * intensity; break;
        case 'top': startY = -distance; overshootY = 30 * intensity; startRotate = 2 * intensity; break;
        case 'bottom': startY = distance; overshootY = -30 * intensity; startRotate = -2 * intensity; break;
    }

    if (isHide) {
        // Simple reverse: Just swipe it back out the way it came
        return swipe(element, {
             ...options,
             reverse: true,
             direction: fromDirection,
             distance: distance,
             rotate: Math.abs(startRotate) // Use original rotation amount
         });
    }

    // Entrance Animation: Zip in -> Overshoot (Skid) -> Wobble back -> Settle
    return animate(element, {
        // Position keyframes: Start -> Overshoot -> Wobble Back 1 -> Wobble Back 2 -> Settle (0)
        x: [startX, overshootX, -overshootX * 0.5, overshootX * 0.2, 0],
        y: [startY, overshootY, -overshootY * 0.5, overshootY * 0.2, 0],
        // Rotation keyframes: Start Rotation -> Skid Rotation -> Wobble Back -> Settle (0)
        rotate: [startRotate, startRotate * 0.8, -startRotate * 0.4, startRotate * 0.2, 0],
        // Optional scale bounce during the skid/wobble
        scale: [0.9, 1.05, 0.98, 1.01, 1],
        opacity: [0, 1] // Fade in as it runs
    }, {
        duration: duration,
        // Expo provides the fast run-in and decelerating settle
        easing: 'easeOutExpo',
        ...options
    });
}


/**
 * Drop and Squash - Element drops from top, squashes on impact, bounces back to size.
 * @param {HTMLElement} element - The dialog element (modal-content).
 * @param {Object} options - Animation options (reverse, intensity, dropHeight).
 * @returns {Object} Animation controller.
 */
export function dropAndSquash(element, options = {}) {
    const isHide = options.reverse === true;
    const intensity = options.intensity || 1;
    const dropHeight = options.dropHeight || 200;
    const duration = options.duration || 900;
    const originalTransformOrigin = element.style.transformOrigin;

    // Set transform origin to bottom center for squash effect
    element.style.transformOrigin = '50% 100%';

    if (isHide) {
        // Reverse: Stretch up (anticipation), then shoot upwards shrinking
        return animate(element, {
            opacity: [1, 0],
            // Stretch slightly, then shrink as it flies up
            scaleY: [1, 1.1 * intensity, 0.5],
            scaleX: [1, 0.9 / intensity, 1.2], // Complementary X scale
            // Move up slightly, then shoot off screen
            y: [0, -30 * intensity, -dropHeight * 1.5]
        }, effectOptions(options, {
            duration: duration * 0.6, // Faster hide
            easing: 'easeInBack(1.5)', // Pull back feel before shooting up
             onComplete: () => {
                element.style.transformOrigin = originalTransformOrigin; // Restore origin
             }
        }));
    }

    // Entrance Animation: Drop -> Impact Squash -> Bounce Stretch -> Settle
    return animate(element, {
        // Position: Drop from height, bounce up slightly multiple times
        y: [-dropHeight, 0, -15 * intensity, 0, -5 * intensity, 0],
        // Vertical Scale (Squash/Stretch): Fall stretched -> Squash flat -> Bounce stretched -> Settle
        scaleY: [0.8, 0.7 / intensity, 1.2 * intensity, 0.9 / intensity, 1.05 * intensity, 1],
        // Horizontal Scale (Complementary): Fall narrow -> Squash wide -> Bounce narrow -> Settle
        scaleX: [1.1, 1.3 * intensity, 0.8 / intensity, 1.1 * intensity, 0.98 / intensity, 1],
        opacity: [0, 1] // Fade in during the drop
    }, effectOptions(options, {
        duration: duration,
        // Bounce easing simulates the impact and bounces naturally
        easing: 'easeOutBounce',
        onComplete: () => {
            element.style.transformOrigin = originalTransformOrigin; // Restore origin
        }
    }));
}

// Export all dialog animations
export default {
  // Refactored Elastic Zoom
  elasticZoom,
  // Enhanced existing
  explosiveZoom,
  slam,
  flip3D,
  swipe,
  bounceIn,
  helicopterIn,
  glitchIn, // Keep if functional
  // New Cartoonish
  paperFold,
  cartoonRunIn,
  dropAndSquash,
};
