// src/animations/loading.js - Animations for loading indicators
import { animate } from '../core/engine';
import { motionOptions } from '../core/motion';

/**
 * Creates a basic spinner animation (border rotation).
 * Assumes element has appropriate border styles applied via CSS.
 * @param {HTMLElement} element - The element to animate as a spinner.
 * @param {Object} options - Animation options (duration, easing, repeat).
 * @returns {Object} Animation controller.
 */
export function spinner(element, options = {}) {
  // Default styling can be applied here if needed, but CSS is preferred
  /* Example inline styling (use CSS classes instead if possible):
  if (!element.style.width) { // Apply only if not styled
      element.style.width = options.size || '30px';
      element.style.height = options.size || '30px';
      element.style.border = `3px solid ${options.trackColor || 'rgba(0, 0, 0, 0.1)'}`;
      element.style.borderTopColor = options.color || '#3B82F6'; // Blue-500
      element.style.borderRadius = '50%';
      element.style.display = element.style.display || 'inline-block';
  }
  */

  return animate(element, {
    // Animate rotation 360 degrees
    rotate: [0, 360]
  }, motionOptions('ambient', options, {
    repeat: options.repeat === undefined ? -1 : options.repeat
  }));
}

/**
 * Creates a dots animation (bouncing or fading).
 * Can accept a container and create dots, or an array of existing dot elements.
 * @param {HTMLElement | HTMLElement[]} elementsOrContainer - Container element or array of dot elements.
 * @param {Object} options - Animation options (count, size, color, staggerDelay, type: 'bounce'|'fade', duration, easing, repeat).
 * @returns {Object} Animation controller (controls all dots).
 */
export function dots(elementsOrContainer, options = {}) {
  let dotElements = [];
  const container = !Array.isArray(elementsOrContainer) ? elementsOrContainer : null;
  const createdDots = [];
  let originalContainerStyles = null;

  if (Array.isArray(elementsOrContainer)) {
    dotElements = elementsOrContainer;
  } else if (container) {
    // Try to find existing dots within the container
    dotElements = Array.from(container.querySelectorAll('.turbulencejs-dot')); // Use a consistent class

    // If no dots found, create them dynamically
    if (dotElements.length === 0) {
      const count = options.count || 3;
      const size = options.size || '8px';
      const color = options.color || '#3B82F6'; // Blue-500
      originalContainerStyles = {
        display: container.style.display,
        gap: container.style.gap,
        alignItems: container.style.alignItems
      };

      // Ensure container is ready for flex/inline dots
      if (window.getComputedStyle(container).display === 'block') {
          container.style.display = 'inline-flex'; // Or 'flex'
          container.style.gap = options.gap || '4px';
          container.style.alignItems = 'center';
      }

      for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = 'turbulencejs-dot'; // Assign class for potential CSS styling/selection
        dot.style.width = size;
        dot.style.height = size;
        dot.style.backgroundColor = color;
        dot.style.borderRadius = '50%';
        // display: inline-block or flex handled by container
        container.appendChild(dot);
        dotElements.push(dot);
        createdDots.push(dot);
      }
    }
  } else {
      console.warn("Turbulence 'dots' animation requires either a container element or an array of dot elements.");
      return { play: ()=>{}, pause: ()=>{}, stop: ()=>{} }; // Return dummy controller
  }

  if (dotElements.length === 0) {
     return { play: ()=>{}, pause: ()=>{}, stop: ()=>{} }; // Nothing to animate
  }

  const animationType = options.type || 'bounce'; // 'bounce' or 'fade'
  const stagger = options.staggerDelay || 150;
  const duration = options.duration || 600;
  const easing = options.easing || 'easeInOutQuad';
  const repeat = options.repeat === undefined ? -1 : options.repeat; // Default infinite

  // Define animation properties based on type
  let animProps;
  if (animationType === 'bounce') {
      animProps = { y: [0, -10, 0] }; // Bounce up and down
  } else { // fade
      animProps = { opacity: [1, 0.3, 1] }; // Fade out and in
  }

  // Create individual animations for each dot
  const animations = dotElements.map((dot, index) => {
    return animate(dot, animProps, {
      delay: index * stagger,
      duration: duration,
      easing: easing,
      repeat: repeat,
      yoyo: options.yoyo || false // Allow yoyo for fade/bounce back and forth
    });
  });

  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    animations.forEach(animation => animation?.stop());
    createdDots.forEach(dot => dot.remove());
    if (container && originalContainerStyles) Object.assign(container.style, originalContainerStyles);
  };

  // Return a controller object to manage all dot animations together
  return {
    play: () => animations.forEach(a => a?.play()),
    pause: () => animations.forEach(a => a?.pause()),
    stop: cleanup,
    _animations: animations // Expose individual animations if needed
  };
}

/**
 * Creates a pulse animation (scaling and fading).
 * @param {HTMLElement} element - The element to animate with a pulse.
 * @param {Object} options - Animation options (size, color, borderRadius, intensity, duration, easing, repeat).
 * @returns {Object} Animation controller.
 */
export function pulse(element, options = {}) {
  /* Optional default styling (prefer CSS):
  if (!element.style.width) {
      element.style.width = options.size || '20px';
      element.style.height = options.size || '20px';
      element.style.backgroundColor = options.color || '#3B82F6';
      element.style.borderRadius = options.borderRadius || '50%';
      element.style.display = element.style.display || 'inline-block';
  }
  */
  const intensity = options.intensity || 1.2; // How much to scale up

  return animate(element, {
    // Scale up and down, fade slightly at normal size
    scale: [1, intensity, 1],
    opacity: [0.7, 1, 0.7]
  }, {
    duration: options.duration || 1500, // Pulse is usually slow
    easing: options.easing || 'easeInOutQuad',
    repeat: options.repeat === undefined ? -1 : options.repeat, // Default infinite
    yoyo: options.yoyo === undefined ? true : options.yoyo, // Default to yoyo for pulsing
    ...options
  });
}

/**
 * Creates a progress bar animation (animating width).
 * Assumes a container element with an inner bar element (or animates the container itself).
 * @param {HTMLElement} barElement - The inner bar element whose width represents progress.
 * @param {number} [startValue=0] - Starting percentage (0-100).
 * @param {number} [endValue=100] - Ending percentage (0-100).
 * @param {Object} options - Animation options (duration, easing).
 * @returns {Object} Animation controller.
 */
export function progress(barElement, startValue = 0, endValue = 100, options = {}) {
  // Ensure values are within bounds
  const from = Math.max(0, Math.min(100, startValue));
  const to = Math.max(0, Math.min(100, endValue));

  /* Optional: Apply basic styling if needed (prefer CSS)
  const container = barElement.parentElement;
  if (container && !container.style.height) {
      container.style.width = '100%';
      container.style.height = options.height || '4px';
      container.style.backgroundColor = options.trackColor || '#e5e7eb'; // gray-200
      container.style.overflow = 'hidden';
      container.style.borderRadius = options.borderRadius || '2px';
      container.style.position = container.style.position || 'relative';
  }
  if (!barElement.style.height) {
       barElement.style.position = 'absolute';
       barElement.style.inset = '0'; // Fill container
       barElement.style.width = `${from}%`; // Initial width
       barElement.style.backgroundColor = options.color || '#3B82F6'; // Blue-500
       barElement.style.borderRadius = options.borderRadius || '2px';
       // Avoid native transition conflicting with JS animation
       barElement.style.transition = 'none';
  }
  */
  // Ensure initial width is set if not already
  if (!barElement.style.width) {
      barElement.style.width = `${from}%`;
  }


  return animate(barElement, {
    // Animate the width property as a percentage string
    width: [`${from}%`, `${to}%`]
  }, {
    duration: options.duration || 1000, // Default 1 second duration
    easing: options.easing || 'easeInOutQuad',
    ...options // Allow passing repeat, delay, onComplete etc.
  });
}

/**
 * Creates a typing indicator animation (like chat app dots).
 * Uses the 'dots' animation internally with specific defaults.
 * @param {HTMLElement} containerElement - The container element for the typing dots.
 * @param {Object} options - Animation options (overrides defaults for 'dots').
 * @returns {Object} Animation controller from the 'dots' function.
 */
export function typing(containerElement, options = {}) {
  // Call the 'dots' animation with defaults suitable for a typing indicator
  return dots(containerElement, {
    count: options.count || 3,
    size: options.size || '6px',
    gap: options.gap || '3px', // Smaller gap for typing dots
    color: options.color || '#9ca3af', // Default gray color (Tailwind gray-400)
    staggerDelay: options.staggerDelay || 180, // Slightly longer stagger
    duration: options.duration || 700,
    easing: options.easing || 'easeInOutQuad',
    type: options.type || 'bounce', // Bounce is typical for typing
    repeat: options.repeat === undefined ? -1 : options.repeat, // Default infinite
    ...options // Allow user overrides
  });
}

export default {
  spinner,
  dots,
  pulse,
  progress,
  typing
};
