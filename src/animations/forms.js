// src/animations/forms.js - Enhanced form feedback animations
import { animate } from '../core/engine';
import { effectLifecycle, effectOptions } from '../core/effect';
import { motionOptions } from '../core/motion';
import utils from '../utils'; // Import the utils module

/**
 * Creates a shake animation for form elements (indicating error).
 * @param {HTMLElement} element - The form element to animate.
 * @param {Object} options - Animation options (intensity, duration).
 * @returns {Object} Animation controller.
 */
export function shake(element, options = {}) {
  const intensity = options.intensity || 1;
  return animate(element, {
    // Use translate for better performance than left/right positioning
    x: [0, -8 * intensity, 8 * intensity, -6 * intensity, 6 * intensity, -4 * intensity, 4 * intensity, 0],
    // Optional: add slight rotation for more wobble during the shake
    // rotate: [0, -0.5*intensity, 0.5*intensity, -0.3*intensity, 0.3*intensity, 0]
  }, motionOptions('feedbackFast', options, { duration: 400 }));
}

/**
 * Creates a highlight animation (e.g., brief background/border color change).
 * @param {HTMLElement} element - The form element to animate.
 * @param {Object} options - Animation options (color: target color, property: 'backgroundColor'|'borderColor'|'outlineColor', duration).
 * @returns {Object} Animation controller.
 */
export function highlight(element, options = {}) {
  const prop = options.property || 'backgroundColor'; // Default to background
  const computedStyle = window.getComputedStyle(element);
  const originalValue = computedStyle[prop];
  // Default highlight colors based on property
  const defaultColors = {
      backgroundColor: 'rgba(250, 204, 21, 0.3)', // Tailwind yellow-300 bg, semi-transparent
      borderColor: '#FBBF24', // Tailwind yellow-400 border
      outlineColor: '#FBBF24'
  };
  const highlightColor = options.color || defaultColors[prop];
  const duration = options.duration ?? 800;

  // Store original inline style to restore it correctly
  const originalInlineStyle = element.style[prop];

  const restore = () => { element.style[prop] = originalInlineStyle; };
  const lifecycle = effectLifecycle(options, { complete: restore, cancel: restore });
  return animate(element, {
    // Animate from original -> highlight -> back to original
    [prop]: [originalValue, highlightColor, originalValue]
  }, {
    ...options,
    duration: duration,
    easing: 'easeInOutQuad',
    onComplete: lifecycle.onComplete,
    onCancel: lifecycle.onCancel
    // Note: Animating layout-affecting props like borderColor can be less performant.
    // OutlineColor is often better. BackgroundColor is generally okay.
    // Consider box-shadow for a non-layout-affecting highlight:
    // boxShadow: ['none', `0 0 0 3px ${highlightColor}`, 'none']
  });
}

/**
 * Creates a success bounce animation with optional border/outline highlight.
 * @param {HTMLElement} element - The form element to animate.
 * @param {Object} options - Animation options (highlight: boolean|'outline'|'border', color, persist: boolean, persistDuration, intensity).
 * @returns {Object} Animation controller.
 */
export function successBounce(element, options = {}) {
  const highlightType = options.highlight === false ? null : (options.highlight || 'outline'); // Default to outline
  const originalStyles = {};
  const highlightColor = options.color || '#10B981'; // Tailwind green-500
  const intensity = options.intensity || 1;
  const duration = options.duration || 400;
  const persistHighlight = options.persist || false;
  const persistDuration = options.persistDuration || 1200; // How long highlight stays if persist=false
  let restoreTimer = null;

  const restoreHighlight = () => {
    if (restoreTimer !== null) clearTimeout(restoreTimer);
    restoreTimer = null;
    if (highlightType === 'outline') {
      element.style.outline = originalStyles.outline;
      element.style.outlineOffset = originalStyles.outlineOffset;
    } else if (highlightType === 'border') {
      element.style.borderColor = originalStyles.borderColor;
    }
  };

  // Apply highlight temporarily
  if (highlightType === 'outline') {
    originalStyles.outline = element.style.outline;
    originalStyles.outlineOffset = element.style.outlineOffset;
    element.style.outline = `2px solid ${highlightColor}`;
    element.style.outlineOffset = '2px';
  } else if (highlightType === 'border') {
     originalStyles.borderColor = element.style.borderColor;
     // Note: Changing border *width* causes layout shift, usually undesirable.
     // Best practice is to ensure border width is constant and only change color.
     element.style.borderColor = highlightColor;
  }

  // Perform the bounce animation
  const anim = animate(element, {
    // Bounce sequence: Up -> Down -> Smaller Up -> Settle
    y: [0, -6 * intensity, 0, -3 * intensity, 0]
  }, effectOptions(options, {
    duration: duration,
    easing: 'easeOutQuad', // Smooth bounce out
    onComplete: () => {
      // Handle highlight removal or persistence
      if (highlightType) {
          if (!persistHighlight) {
            // Remove highlight after a delay
            restoreTimer = setTimeout(restoreHighlight, persistDuration);
          }
          // If persistHighlight is true, the highlight remains.
      }
    },
    onCancel: restoreHighlight
  }));
  return anim;
}

/**
 * Creates a floating label animation (moves up and shrinks).
 * Assumes label is positioned absolutely relative to input.
 * @param {HTMLElement} label - The label element to animate.
 * @param {'float' | 'reset'} state - Target state ('float' up, 'reset' down).
 * @param {Object} options - Animation options (distance, scale, duration).
 * @returns {Object} Animation controller.
 */
export function floatingLabel(label, state = 'float', options = {}) {
  const defaults = {
    distance: options.distance || -22, // Typical distance to move label up
    scale: options.scale || 0.85,       // Typical shrink scale for floated label
    duration: options.duration || 200, // Quick transition
    easing: 'easeOutQuad',
    color: options.color || '#6b7280', // Default floated color (Tailwind gray-500)
    focusedColor: options.focusedColor || '#2563EB' // Optional different color on focus
  };
  const config = { ...defaults, ...options };

  // Determine target properties based on state
  const targetProps = (state === 'float')
    ? {
        y: config.distance,
        scale: config.scale,
        opacity: 0.9, // Slightly fade floated label? Optional.
        color: config.focusedColor || config.color // Use focused color if floating (implies focus or value)
      }
    : { // Reset state
        y: 0,
        scale: 1,
        opacity: 1,
        color: '' // Reset to default CSS color
      };

  // Get current transform values to animate *from* correctly.
  const currentTransform = utils.transform.getCurrentTransform(label);
  const currentProps = {
      y: currentTransform.translateY || 0,
      scale: currentTransform.scaleX || 1, // Assuming uniform scale
      opacity: parseFloat(label.style.opacity || 1),
      color: label.style.color || window.getComputedStyle(label).color
  };

  return animate(label, {
      y: [currentProps.y, targetProps.y],
      scale: [currentProps.scale, targetProps.scale],
      opacity: [currentProps.opacity, targetProps.opacity],
      color: [currentProps.color, targetProps.color] // Animate color
  }, effectOptions(options, {
    duration: config.duration,
    easing: config.easing,
    onComplete: () => {
        // Ensure final color state is applied if animation was short/interrupted
        label.style.color = targetProps.color;
    },
    onCancel: () => { label.style.color = currentProps.color; }
  }));
}

/**
 * Creates validation feedback (success or error) using other animations.
 * @param {HTMLElement} element - The form element associated with the feedback.
 * @param {boolean} isValid - Whether the input is valid.
 * @param {Object} options - Animation options passed to shake/successBounce.
 * @returns {Object} Animation controller.
 */
export function validationFeedback(element, isValid, options = {}) {
  if (isValid) {
    // Success: Use successBounce, optionally add subtle scale pulse
    animate(element, { scale: [1, 1.02, 1] }, { duration: 300, easing: 'easeOutQuad' });
    return successBounce(element, { highlight: 'outline', color: '#10B981', ...options });
  } else {
    // Error: Use shake, optionally add highlight flash
    highlight(element, { color: 'rgba(239, 68, 68, 0.2)', property: 'backgroundColor', duration: 400 });
    return shake(element, options);
  }
  // Note: For adding checkmark/cross icons, you'd animate SVG paths or the visibility/transform of icon elements separately.
}


// --- Added Cartoonish/Playful Animations ---

/**
 * Input Focus Zoom - Border/Outline zooms in slightly with a bounce on focus.
 * @param {HTMLElement} element - The input element.
 * @param {'focus' | 'blur'} state - Focus or blur state.
 * @param {Object} options - Animation options (useOutline, color, scale, intensity).
 * @returns {Object} Animation controller.
 */
export function inputFocusZoom(element, state = 'focus', options = {}) {
    const useOutline = options.useOutline !== false; // Default to using outline (better performance)
    const color = options.color || '#3B82F6'; // Blue focus color (Tailwind blue-500)
    const scale = options.scale || 1.03; // Subtle scale increase
    const intensity = options.intensity || 1; // For bounce intensity
    const duration = options.duration || 250;
    // Store original inline styles
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;
    const originalBorderColor = element.style.borderColor; // If animating border
    const originalTransform = element.style.transform; // Store original transform


    if (state === 'focus') {
        // Apply focus style immediately (color change)
        if (useOutline) {
            element.style.outline = `2px solid ${color}`;
            element.style.outlineOffset = '1px';
        } else {
             element.style.borderColor = color; // Change border color instantly
        }
        // Animate scale with overshoot/bounce
        return animate(element, {
            // Scale up past target, then settle
            scale: [1, scale * 1.05 * intensity, scale * 0.98 / intensity, scale]
        }, { duration, easing: 'easeOutBack(2)', ...options });

    } else { // Blur state
        // Animate scale back down smoothly
        let resetTimer = null;
        const restore = () => {
            if (resetTimer !== null) clearTimeout(resetTimer);
            if (useOutline) {
                element.style.outline = originalOutline;
                element.style.outlineOffset = originalOutlineOffset;
            } else {
                element.style.borderColor = originalBorderColor;
            }
            element.style.transform = originalTransform;
        };
        const lifecycle = effectLifecycle(options, { complete: restore, cancel: restore });
        const anim = animate(element, {
            scale: [element.getBoundingClientRect().width / element.offsetWidth || scale, 1] // Animate from current scale back to 1
        }, {
            ...options,
            duration: duration * 1.2,
            easing: 'easeOutQuad',
            onComplete: lifecycle.onComplete,
            onCancel: lifecycle.onCancel
        });

        // Reset outline/border color after animation starts settling
        resetTimer = setTimeout(() => {
            if (useOutline) {
                element.style.outline = originalOutline;
                element.style.outlineOffset = originalOutlineOffset;
            } else {
                 element.style.borderColor = originalBorderColor;
            }
        }, duration * 0.5); // Reset color slightly before scale finishes

        return anim;
    }
}


/**
 * Label Hop - Label hops up with a bounce when input receives value or focus.
 * @param {HTMLElement} label - The label element to animate.
 * @param {'hopUp' | 'reset'} state - Target state.
 * @param {Object} options - Animation options (distance, scale, duration, easing).
 * @returns {Object} Animation controller.
 */
export function labelHop(label, state = 'hopUp', options = {}) {
    const defaults = {
        distance: options.distance || -22,
        scale: options.scale || 0.85,
        duration: options.duration || 400, // Slightly longer for bounce
        easing: options.easing || 'easeOutBounce', // Default to bounce easing
        color: options.color || '#6b7280',
        focusedColor: options.focusedColor || '#2563EB'
    };
    const config = { ...defaults, ...options };

    // Define target properties for hopUp and reset states
    const targetProps = (state === 'hopUp')
        ? {
            // Bounce sequence for Y: Hop past target, dip below, settle
            y: [0, config.distance - 10, config.distance + 3, config.distance],
            // Scale sequence: Shrink past target, slightly expand, settle
            scale: [1, config.scale * 0.95, config.scale * 1.05, config.scale],
            opacity: [1, 0.9], // Slightly fade
            color: config.focusedColor || config.color
          }
        : { // Reset state with slight bounce
            y: [config.distance, 5, 0], // Fall past original, bounce up, settle
            scale: [config.scale, 1.05, 1], // Grow past original, shrink back, settle
            opacity: [0.9, 1],
            color: '' // Reset color
          };

    // Get current transform for smooth transitions from current state
    const currentTransform = utils.transform.getCurrentTransform(label);
    const currentProps = {
        y: currentTransform.translateY || ((state === 'hopUp') ? 0 : config.distance), // Estimate start based on state
        scale: currentTransform.scaleX || ((state === 'hopUp') ? 1 : config.scale),
        opacity: parseFloat(label.style.opacity || 1),
        color: label.style.color || window.getComputedStyle(label).color
    };

    return animate(label, {
        y: targetProps.y,
        scale: targetProps.scale,
        opacity: targetProps.opacity,
        color: [currentProps.color, targetProps.color]
    }, effectOptions(options, {
        duration: config.duration,
        easing: config.easing,
         onComplete: () => {
            // Ensure final color state
            label.style.color = targetProps.color;
         },
        onCancel: () => { label.style.color = currentProps.color; }
    }));
}

/**
 * Error Wobble - A more exaggerated, jelly-like shake for errors using rotation.
 * @param {HTMLElement} element - The form element to animate.
 * @param {Object} options - Animation options (intensity, duration).
 * @returns {Object} Animation controller.
 */
export function errorWobble(element, options = {}) {
    const intensity = options.intensity || 1;
    const originalTransformOrigin = element.style.transformOrigin;

    // Anchor from bottom center often gives a good wobble feel
    element.style.transformOrigin = '50% 100%';

    const anim = animate(element, {
        // Rotation sequence for wobble effect
        rotate: [0, -3 * intensity, 3 * intensity, -2 * intensity, 2 * intensity, -1 * intensity, 1 * intensity, 0],
        // Optional subtle X movement can enhance the wobble
        x: [0, -2 * intensity, 2 * intensity, -1 * intensity, 1 * intensity, 0]
    }, effectOptions(options, {
        duration: options.duration || 600, // Wobble can be slightly longer than shake
        // Elastic easing provides the springy wobble effect
        easing: `easeOutElastic(1, ${0.5 / intensity})`,
        onComplete: () => {
             element.style.transformOrigin = originalTransformOrigin; // Restore origin
        }
    }));
    return anim;
}

export default {
  // Standard Feedback
  shake,
  highlight,
  successBounce,
  floatingLabel,
  validationFeedback, // Combines others
  // Playful / Cartoonish Feedback
  inputFocusZoom,
  labelHop,
  errorWobble,
};
