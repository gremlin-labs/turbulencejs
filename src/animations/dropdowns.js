// src/animations/dropdowns.js - Refactored for reliability and clarity
import { animate } from '../core/engine';
import { effectLifecycle } from '../core/effect';
import { motionOptions } from '../core/motion';

// --- Helper Functions ---

/** Helper to measure auto height accurately */
function measureAutoHeight(element) {
    const originalStyles = {
        height: element.style.height,
        visibility: element.style.visibility,
        display: element.style.display,
        position: element.style.position,
        zIndex: element.style.zIndex,
        opacity: element.style.opacity,
        overflow: element.style.overflow // Include overflow
    };

    // Apply styles for measurement
    element.style.height = 'auto';
    element.style.visibility = 'hidden';
    element.style.display = 'block'; // Ensure it's block for offsetHeight
    element.style.position = 'absolute'; // Take out of flow
    element.style.zIndex = '-9999'; // Hide visually and from interactions
    element.style.opacity = '0';
    element.style.overflow = 'hidden'; // Prevent scrollbars during measurement

    const height = element.offsetHeight;

    // Restore original styles
    Object.assign(element.style, originalStyles);

    return height;
}

/** Helper to manage perspective on parent */
function setPerspective(element, value) {
    const parent = element.parentElement;
    if (parent) {
        parent.dataset.originalPerspective = parent.style.perspective || 'none';
        parent.style.perspective = value;
    }
}

/** Helper to restore original perspective on parent */
function restorePerspective(element) {
    const parent = element.parentElement;
    if (parent && parent.dataset.originalPerspective !== undefined) {
        parent.style.perspective = parent.dataset.originalPerspective === 'none' ? '' : parent.dataset.originalPerspective;
        delete parent.dataset.originalPerspective;
    }
}


// --- Animation Functions ---

/**
 * Expansion/collapse animation with elastic bounce. Animates height and opacity.
 * Handles display: none on hide completion.
 * @param {HTMLElement} element - The dropdown menu element.
 * @param {Object} options - Animation options (reverse, duration).
 * @returns {Object} Animation controller.
 */
export function explosiveExpand(element, options = {}) {
  const isHide = options.reverse === true;
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;
  const originalOpacity = element.style.opacity;
  const duration = options.duration ?? (isHide ? 350 : 500);

  let animProps = {};
  let finalHeight = '';
  let finalOpacity = '1';

  if (!isHide) {
    // --- Show Animation ---
    const autoHeight = measureAutoHeight(element);
    // Set initial state explicitly before animation starts
    element.style.overflow = 'hidden';
    element.style.height = '0px';
    element.style.opacity = '0';
    void element.offsetHeight; // Reflow

    animProps = {
      height: [0, autoHeight * 1.15, autoHeight * 0.95, autoHeight * 1.02, autoHeight],
      opacity: [0, 1]
    };
    finalHeight = ''; // Auto height
    finalOpacity = '1';

  } else {
    // --- Hide Animation ---
    const currentHeight = element.offsetHeight;
    element.style.overflow = 'hidden'; // Ensure overflow hidden for collapse

    animProps = {
      height: [currentHeight, currentHeight * 1.05, 0],
      opacity: [1, 0] // Simplified fade out
    };
    finalHeight = '0px';
    finalOpacity = '0';
    // Final display: none will be set in onComplete
  }

  const lifecycle = effectLifecycle(options, {
    complete: el => {
      el.style.overflow = originalOverflow;
      el.style.height = finalHeight;
      el.style.opacity = finalOpacity;
      if (isHide) el.style.display = 'none';
    },
    cancel: el => {
      el.style.overflow = originalOverflow;
      el.style.height = originalHeight;
      el.style.opacity = originalOpacity;
    }
  });

  return animate(element, animProps, {
      ...motionOptions(isHide ? 'stateExit' : 'stateEnter', options, {
        duration,
        easing: isHide ? 'easeInBack(1.5)' : 'easeOutElastic(1, 0.6)'
      }),
      onComplete: lifecycle.onComplete,
      onCancel: lifecycle.onCancel
  });
}

/**
 * Fan-out effect for dropdown ITEMS. Container visibility MUST be handled separately.
 * @param {HTMLElement} container - The dropdown menu element containing the items.
 * @param {Object} options - Animation options (itemSelector, origin, radius, rotation, staggerDelay, reverse).
 * @returns {Object | null} Animation controller or null if no items.
 */
export function fanItems(container, options = {}) {
  const selector = options.itemSelector || 'li, .dropdown-item';
  const items = Array.from(container.querySelectorAll(selector));
  if (items.length === 0) {
    console.warn("fanItems: No items found with selector:", selector);
    return null;
  }

  const isHide = options.reverse === true;
  const origin = options.origin || 'top';
  const fanRadius = options.radius || 15;
  const fanRotation = options.rotation || 8;
  const stagger = options.staggerDelay || 25;
  const duration = options.duration || 400;
  const userOnComplete = options.onComplete; // Store user callback

  // This function ONLY animates items. Assume container is already visible/animating separately.

  const itemAnimations = items.map((item, index) => {
    let offsetX = 0, offsetY = 0, rotation = 0;
    const progress = items.length <= 1 ? 0 : (index / (items.length - 1)) * 2 - 1;

    switch(origin) {
        case 'top': offsetY = -fanRadius * 1.2; offsetX = progress * fanRadius; rotation = progress * fanRotation; break;
        case 'bottom': offsetY = fanRadius * 1.2; offsetX = progress * fanRadius; rotation = -progress * fanRotation; break;
        case 'left': offsetX = -fanRadius * 1.2; offsetY = progress * fanRadius; rotation = -progress * fanRotation; break;
        case 'right': offsetX = fanRadius * 1.2; offsetY = progress * fanRadius; rotation = progress * fanRotation; break;
    }

    const delay = isHide ? (items.length - 1 - index) * stagger : index * stagger;
    item.dataset.originalTransform = item.style.transform || '';
    item.dataset.originalOpacity = item.style.opacity || '';

    // Initial state for entrance
    if (!isHide) {
        item.style.opacity = '0';
        item.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(0.7)`;
    }

    const animProps = {
      opacity: isHide ? [1, 0] : [0, 1],
      x: isHide ? [0, offsetX] : [offsetX, 0],
      y: isHide ? [0, offsetY] : [offsetY, 0],
      rotate: isHide ? [0, rotation] : [rotation, 0],
      scale: isHide ? [1, 0.7] : [0.7, 1]
    };

    return animate(item, animProps, {
      duration: duration,
      delay: delay,
      easing: isHide ? 'easeInBack(1)' : 'easeOutBack(1.5)',
      onComplete: () => {
          if (isHide) {
              // Reset item styles after hiding
              item.style.opacity = '0'; // Ensure hidden
          } else {
              item.style.opacity = item.dataset.originalOpacity;
          }
          item.style.transform = item.dataset.originalTransform;
          delete item.dataset.originalTransform;
          delete item.dataset.originalOpacity;
          // User item callback
          if (options.onItemComplete) options.onItemComplete(item, index);
          // Call main onComplete after the LAST item finishes
          if (index === (isHide ? 0 : items.length - 1) && userOnComplete) {
              userOnComplete(container);
          }
      },
      onCancel: () => {
          item.style.opacity = item.dataset.originalOpacity;
          item.style.transform = item.dataset.originalTransform;
          delete item.dataset.originalTransform;
          delete item.dataset.originalOpacity;
      }
    });
  });

  // Return combined controller
  return {
    play: () => itemAnimations.forEach(a => a?.play()),
    pause: () => itemAnimations.forEach(a => a?.pause()),
    stop: () => itemAnimations.forEach(a => a?.stop()),
    _animations: itemAnimations
  };
}

/**
 * 3D rotation effect for the dropdown menu itself. Animates rotation, height, opacity.
 * Handles display: none on hide completion.
 * @param {HTMLElement} element - The dropdown menu element.
 * @param {Object} options - Animation options (axis: 'X'|'Y', origin, perspective, reverse).
 * @returns {Object} Animation controller.
 */
export function rotate3D(element, options = {}) {
  const isHide = options.reverse === true;
  const perspective = options.perspective || '800px';
  const axis = options.axis || 'X';
  const rotateProperty = `rotate${axis}`;
  const origin = options.origin || (axis === 'X' ? 'top center' : 'left center');
  const duration = options.duration || 500;
  const userOnComplete = options.onComplete;

  // Store original styles
  const originalTransformOrigin = element.style.transformOrigin;
  const originalBackfaceVisibility = element.style.backfaceVisibility;
  const originalOverflow = element.style.overflow;
  const originalTransform = element.style.transform;


  setPerspective(element, perspective);
  element.style.transformOrigin = origin;
  element.style.backfaceVisibility = 'hidden';
  element.style.overflow = 'hidden';

  const rotationStart = isHide ? 0 : (options.rotationStart || -90);
  const rotationEnd = isHide ? (options.rotationEnd || -90) : 0;

  const props = { opacity: isHide ? [1, 0] : [0, 1] };
  props[rotateProperty] = [rotationStart, rotationEnd];

  let finalHeight = '';
  let finalOpacity = '1';

  if (!isHide) {
      const autoHeight = measureAutoHeight(element);
      element.style.height = '0px';
      element.style.opacity = '0';
      props.height = [0, autoHeight];
      finalHeight = ''; // Auto
  } else {
      props.height = [element.offsetHeight, 0];
      finalHeight = '0px';
      finalOpacity = '0';
  }

  return animate(element, props, {
    ...options,
    duration: duration,
    easing: isHide ? 'easeInBack(1.5)' : 'easeOutBack(1.5)',
    onComplete: (el) => {
      restorePerspective(el);
      // Restore original styles carefully
      el.style.transformOrigin = originalTransformOrigin;
      el.style.backfaceVisibility = originalBackfaceVisibility;
      el.style.overflow = originalOverflow;
      el.style.height = finalHeight;
      el.style.opacity = finalOpacity;
      el.style.transform = originalTransform; // Clear rotation
      if (isHide) {
        el.style.display = 'none'; // *** Set display: none on hide complete ***
      }
      if (userOnComplete) userOnComplete(el);
    }
  });
}


/**
 * Floating panel effect (Y translation + shadow). Animates height, opacity, Y, boxShadow.
 * Handles display: none on hide completion.
 * @param {HTMLElement} element - The dropdown menu element.
 * @param {Object} options - Animation options (reverse, shadow, distance).
 * @returns {Object} Animation controller.
 */
export function floatingPanel(element, options = {}) {
  const isHide = options.reverse === true;
  const duration = options.duration || 400;
  const distance = options.distance || 15;
  const userOnComplete = options.onComplete;

  // Store original styles
  const originalBoxShadow = element.style.boxShadow;
  const originalOverflow = element.style.overflow;
  const originalTransform = element.style.transform;


  const shadowIdle = '0 2px 5px rgba(0,0,0,0.1)';
  const shadowActive = options.shadow || '0 10px 25px rgba(0,0,0,0.15)';

  const props = {
    opacity: isHide ? [1, 0] : [0, 1],
    y: isHide ? [0, distance] : [distance, 0],
    boxShadow: isHide ? [shadowActive, shadowIdle, 'none'] : [shadowIdle, shadowActive]
  };

  let finalHeight = '';
  let finalOpacity = '1';
  let finalShadow = shadowActive;

  if (!isHide) {
      const autoHeight = measureAutoHeight(element);
      element.style.overflow = 'hidden';
      element.style.height = '0px';
      element.style.opacity = '0';
      // Set initial transform state explicitly
      element.style.transform = `translateY(${distance}px)`;
      props.height = [0, autoHeight];
      finalHeight = ''; // Auto
  } else {
      element.style.overflow = 'hidden';
      props.height = [element.offsetHeight, 0];
      finalHeight = '0px';
      finalOpacity = '0';
      finalShadow = originalBoxShadow; // Restore original
  }

  return animate(element, props, {
    ...options,
    duration: duration,
    easing: isHide ? 'easeInQuad' : 'easeOutQuad',
    onComplete: (el) => {
      el.style.overflow = originalOverflow;
      el.style.height = finalHeight;
      el.style.opacity = finalOpacity;
      el.style.boxShadow = finalShadow;
      // Clear transform only if showing, otherwise keep hidden transform (or let display none handle)
      el.style.transform = isHide ? el.style.transform : originalTransform;
      if (isHide) {
        el.style.display = 'none'; // *** Set display: none on hide complete ***
      }
      if (userOnComplete) userOnComplete(el);
    }
  });
}


/**
 * Swipe/reveal effect using clip-path. Animates clipPath, height, opacity.
 * Handles display: none on hide completion.
 * @param {HTMLElement} element - The dropdown menu element.
 * @param {Object} options - Animation options (direction: 'top'|'bottom'|'left'|'right'|'center', reverse).
 * @returns {Object} Animation controller.
 */
export function dramaticSwipe(element, options = {}) {
  const isHide = options.reverse === true;
  const duration = options.duration || 500;
  const direction = options.direction || 'bottom';
  const userOnComplete = options.onComplete;

  // Store original styles
  const originalClipPath = element.style.clipPath;
  const originalOverflow = element.style.overflow;

  let clipStart, clipEnd;
  switch(direction) {
    case 'left': clipStart = 'inset(0 100% 0 0)'; clipEnd = 'inset(0 0 0 0)'; break;
    case 'right': clipStart = 'inset(0 0 0 100%)'; clipEnd = 'inset(0 0 0 0)'; break;
    case 'top': clipStart = 'inset(100% 0 0 0)'; clipEnd = 'inset(0 0 0 0)'; break;
    case 'center':
        clipStart = 'circle(0% at 50% 50%)';
        const radius = Math.sqrt(50**2 + 50**2) + 5; // %
        clipEnd = `circle(${radius}% at 50% 50%)`;
        break;
    case 'bottom': default: clipStart = 'inset(0 0 100% 0)'; clipEnd = 'inset(0 0 0 0)'; break;
  }

  element.style.overflow = 'hidden'; // Needed with clip-path

  const props = {
      clipPath: isHide ? [clipEnd, clipStart] : [clipStart, clipEnd],
      opacity: isHide ? [1, 0] : [0, 1]
  };

  let finalHeight = '';
  let finalOpacity = '1';
  let finalClipPath = originalClipPath; // Restore original or clear

  if (!isHide) {
      const autoHeight = measureAutoHeight(element);
      element.style.height = '0px';
      element.style.opacity = '0';
      element.style.clipPath = clipStart; // Set initial clip-path
      props.height = [0, autoHeight];
      finalHeight = ''; // Auto
      finalClipPath = ''; // Remove clip-path after showing
  } else {
      props.height = [element.offsetHeight, 0];
      finalHeight = '0px';
      finalOpacity = '0';
      // Keep final clipPath as clipStart to ensure hidden state
      finalClipPath = clipStart;
  }

   return animate(element, props , {
       ...options,
       duration: duration,
       easing: isHide ? 'easeInCubic' : 'easeOutCubic',
       onComplete: (el) => {
            el.style.overflow = originalOverflow;
            el.style.clipPath = finalClipPath;
            el.style.height = finalHeight;
            el.style.opacity = finalOpacity;
            if (isHide) {
               el.style.display = 'none'; // *** Set display: none on hide complete ***
            }
            if (userOnComplete) userOnComplete(el);
       }
   });
}


/**
 * "Deck of cards" effect for ITEMS. Container visibility MUST be handled separately.
 * @param {HTMLElement} container - The dropdown menu element containing the items.
 * @param {Object} options - Animation options (itemSelector, staggerDelay, reverse).
 * @returns {Object | null} Animation controller or null if no items.
 */
export function cardDeck(container, options = {}) {
  const selector = options.itemSelector || 'li, .dropdown-item';
  const items = Array.from(container.querySelectorAll(selector));
  if (items.length === 0) return null;

  const isHide = options.reverse === true;
  const stagger = options.staggerDelay || 50;
  const duration = options.duration || 400;
  const userOnComplete = options.onComplete; // User's main callback
  const perspective = options.perspective || '1000px';
  const originalOverflow = container.style.overflow;

  // Container needs perspective and visible overflow for this effect
  setPerspective(container, perspective);
  container.style.overflow = 'visible';

  const itemAnimations = items.map((item, index) => {
    item.dataset.originalTransform = item.style.transform || '';
    item.dataset.originalOpacity = item.style.opacity || '';
    item.dataset.originalZIndex = item.style.zIndex || '';

    const delay = isHide ? (items.length - 1 - index) * stagger : index * stagger;
    const initialY = -20;
    const initialRotateX = 60;
    const zOffset = 5;

    if (!isHide) {
        item.style.opacity = '0';
        item.style.transform = `translateY(${initialY}px) translateZ(${index * -zOffset}px) rotateX(${initialRotateX}deg)`;
    } else {
         item.style.zIndex = index; // Ensure correct hide order
    }

    const animProps = {
      opacity: isHide ? [1, 0] : [0, 1],
      y: isHide ? [0, initialY] : [initialY, 0],
      z: isHide ? [0, index * -zOffset] : [index * -zOffset, 0],
      rotateX: isHide ? [0, initialRotateX] : [initialRotateX, 0],
    };

    return animate(item, animProps, {
      duration: duration,
      delay: delay + (isHide ? 0 : 50),
      easing: isHide ? 'easeInQuad' : 'easeOutQuad',
      onComplete: () => {
        if (isHide) {
            item.style.opacity = '0'; // Ensure hidden
            item.style.transform = item.dataset.originalTransform;
            item.style.zIndex = item.dataset.originalZIndex;
        } else {
            item.style.transform = ''; // Clear transform
            item.style.zIndex = '';
        }
        delete item.dataset.originalTransform;
        delete item.dataset.originalOpacity;
        delete item.dataset.originalZIndex;

        // Call main onComplete after the LAST item finishes
        if (index === (isHide ? 0 : items.length - 1)) {
            restorePerspective(container); // Restore container perspective
            container.style.overflow = originalOverflow;
            // Container display/height is handled externally
            if (userOnComplete) userOnComplete(container);
        }
        if (options.onItemComplete) options.onItemComplete(item, index);
      },
      onCancel: () => {
        item.style.opacity = item.dataset.originalOpacity;
        item.style.transform = item.dataset.originalTransform;
        item.style.zIndex = item.dataset.originalZIndex;
        delete item.dataset.originalTransform;
        delete item.dataset.originalOpacity;
        delete item.dataset.originalZIndex;
        if (index === 0) {
          restorePerspective(container);
          container.style.overflow = originalOverflow;
        }
      }
    });
  });

  return {
    play: () => itemAnimations.forEach(a => a?.play()),
    pause: () => itemAnimations.forEach(a => a?.pause()),
    stop: () => itemAnimations.forEach(a => a?.stop()),
    _animations: itemAnimations
  };
}

// --- Added Cartoonish Animations ---

/**
 * Cascade Items - Items fall/fade into place sequentially. Container animation MUST be handled separately.
 * @param {HTMLElement} container - The dropdown menu element containing the items.
 * @param {Object} options - Animation options (itemSelector, staggerDelay, reverse, direction: 'down'|'up').
 * @returns {Object | null} Animation controller or null if no items.
 */
export function cascadeItems(container, options = {}) {
    const selector = options.itemSelector || 'li, .dropdown-item';
    const items = Array.from(container.querySelectorAll(selector));
    if (items.length === 0) return null;

    const isHide = options.reverse === true;
    const stagger = options.staggerDelay || 35;
    const duration = options.duration || 300;
    const direction = options.direction || 'down';
    const moveY = (direction === 'down' ? -15 : 15);
    const userOnComplete = options.onComplete;

    // This function ONLY animates items.

    const itemAnimations = items.map((item, index) => {
        const delay = isHide ? (items.length - 1 - index) * stagger : index * stagger;
        item.dataset.originalTransform = item.style.transform || '';
        item.dataset.originalOpacity = item.style.opacity || '';

        if (!isHide) {
             item.style.opacity = '0';
             item.style.transform = `translateY(${moveY}px)`;
        }

        const animProps = {
            opacity: isHide ? [1, 0] : [0, 1],
            y: isHide ? [0, moveY] : [moveY, 0],
        };

        return animate(item, animProps, {
            duration: duration,
            delay: delay,
            easing: isHide ? 'easeInSine' : 'easeOutSine',
            onComplete: () => {
                if (isHide) {
                    item.style.opacity = '0'; // Ensure hidden
                    item.style.transform = item.dataset.originalTransform;
                } else {
                    item.style.transform = ''; // Clear transform
                }
                delete item.dataset.originalTransform;
                delete item.dataset.originalOpacity;

                // Call main onComplete after last item finishes
                if (index === (isHide ? 0 : items.length - 1) && userOnComplete) {
                    userOnComplete(container);
                }
                if (options.onItemComplete) options.onItemComplete(item, index);
            },
            onCancel: () => {
                item.style.opacity = item.dataset.originalOpacity;
                item.style.transform = item.dataset.originalTransform;
                delete item.dataset.originalTransform;
                delete item.dataset.originalOpacity;
            }
        });
    });

     return {
        play: () => itemAnimations.forEach(a => a?.play()),
        pause: () => itemAnimations.forEach(a => a?.pause()),
        stop: () => itemAnimations.forEach(a => a?.stop()),
        _animations: itemAnimations
    };
}

/**
 * Unroll Effect - Menu appears to unroll like a scroll. Animates rotation, height/width, opacity.
 * Handles display: none on hide completion.
 * @param {HTMLElement} element - The dropdown menu element.
 * @param {Object} options - Animation options (reverse, direction: 'vertical'|'horizontal', perspective).
 * @returns {Object} Animation controller.
 */
export function unroll(element, options = {}) {
    const isHide = options.reverse === true;
    const direction = options.direction || 'vertical';
    const perspective = options.perspective || '1000px';
    const duration = options.duration || 600;
    const axis = direction === 'vertical' ? 'X' : 'Y';
    const rotateProp = `rotate${axis}`;
    const origin = direction === 'vertical' ? 'top center' : 'left center';
    const userOnComplete = options.onComplete;

    // Store original styles
    const originalTransformOrigin = element.style.transformOrigin;
    const originalBackfaceVisibility = element.style.backfaceVisibility;
    const originalOverflow = element.style.overflow;
    const originalTransform = element.style.transform;


    setPerspective(element, perspective);
    element.style.transformOrigin = origin;
    element.style.backfaceVisibility = 'hidden';
    element.style.overflow = 'hidden';

    const props = { opacity: isHide ? [1, 0] : [0, 1] };
    props[rotateProp] = isHide ? [0, -180] : [-180, 0]; // Unroll rotation

    let finalSizeProp = '';
    let finalSizeValue = '';

    if (direction === 'vertical') {
        finalSizeProp = 'height';
        if (!isHide) {
            const autoHeight = measureAutoHeight(element);
            element.style.height = '0px';
             element.style.opacity = '0';
            props.height = [0, autoHeight];
            finalSizeValue = ''; // Auto
        } else {
            props.height = [element.offsetHeight, 0];
            finalSizeValue = '0px';
        }
    } else { // Horizontal
         finalSizeProp = 'width';
         const currentWidth = element.offsetWidth || parseFloat(window.getComputedStyle(element).width);
         if (!isHide) {
             element.style.width = '0px';
              element.style.opacity = '0';
             props.width = [0, currentWidth];
             finalSizeValue = ''; // Auto or original
         } else {
             props.width = [currentWidth, 0];
             finalSizeValue = '0px';
         }
    }

    return animate(element, props, {
        ...options,
        duration: duration,
        easing: isHide ? 'easeInCubic' : 'easeOutCubic',
        onComplete: (el) => {
            restorePerspective(el);
            // Restore styles
            el.style.transformOrigin = originalTransformOrigin;
            el.style.backfaceVisibility = originalBackfaceVisibility;
            el.style.overflow = originalOverflow;
            el.style[finalSizeProp] = finalSizeValue;
            el.style.opacity = isHide ? '0' : '1';
            el.style.transform = originalTransform; // Clear rotation

            if (isHide) {
               el.style.display = 'none'; // *** Set display: none on hide complete ***
            }
            if (userOnComplete) userOnComplete(el);
        }
    });
}


// Export all dropdown animations
export default {
  // Container & Item Animations (Need external container handling)
  fanItems,
  cascadeItems,
  cardDeck,
  // Menu Animations (Self-contained)
  explosiveExpand,
  rotate3D,
  floatingPanel,
  dramaticSwipe,
  unroll,
};
