// Enhanced mock implementation with dramatic animations
// Fix for direct browser usage without a module bundler

(function(global) {
  // Helper functions
  function getTransformValue(prop, value) {
    const transforms = {
      x: `translateX(${value}px)`,
      y: `translateY(${value}px)`,
      scale: `scale(${value})`,
      scaleX: `scaleX(${value})`,
      scaleY: `scaleY(${value})`,
      rotate: `rotate(${value}deg)`,
      rotateX: `rotateX(${value}deg)`,
      rotateY: `rotateY(${value}deg)`
    };

    return transforms[prop] || '';
  }

  // Main animation function
  function animate(element, properties, options = {}) {
    // Default options
    const defaults = {
      duration: 300,
      easing: 'ease-in-out',
      delay: 0,
      repeat: 0,
      yoyo: false,
      onStart: null,
      onUpdate: null,
      onComplete: null,
      reverse: false
    };

    // Merge options with defaults
    const config = { ...defaults, ...options };

    // Create keyframes array
    const keyframes = [];
    const transforms = {};

    // Process each property
    for (const [prop, value] of Object.entries(properties)) {
      if (Array.isArray(value)) {
        // Process multiple keyframes
        const len = value.length;
        for (let i = 0; i < len; i++) {
          if (!keyframes[i]) keyframes[i] = {};

          // Handle transform properties specially
          if (['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate', 'rotateX', 'rotateY'].includes(prop)) {
            if (!transforms[i]) transforms[i] = [];
            transforms[i].push(getTransformValue(prop, value[i]));
          } else {
            keyframes[i][prop] = value[i];
          }
        }
      } else {
        // Process simple from/to
        if (!keyframes[0]) keyframes[0] = {};
        if (!keyframes[1]) keyframes[1] = {};

        // Handle transform properties specially
        if (['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate', 'rotateX', 'rotateY'].includes(prop)) {
          if (!transforms[0]) transforms[0] = [];
          if (!transforms[1]) transforms[1] = [];

          transforms[0].push(getTransformValue(prop, 0));
          transforms[1].push(getTransformValue(prop, value));
        } else {
          // Get current value if available
          const computed = window.getComputedStyle(element);
          keyframes[0][prop] = computed[prop] || 0;
          keyframes[1][prop] = value;
        }
      }
    }

    // Apply transforms to keyframes
    for (let i = 0; i < keyframes.length; i++) {
      if (transforms[i] && transforms[i].length) {
        keyframes[i].transform = transforms[i].join(' ');
      }
    }

    // Reverse keyframes if needed
    if (config.reverse) {
      keyframes.reverse();
    }

    // Create animation options
    const animationOptions = {
      duration: config.duration,
      easing: config.easing,
      delay: config.delay,
      iterations: config.repeat === -1 ? Infinity : config.repeat + 1,
      direction: config.yoyo ? 'alternate' : 'normal',
      fill: 'forwards'
    };

    // Call onStart callback
    if (config.onStart) {
      config.onStart(element);
    }

    // Create and play animation
    const animation = element.animate(keyframes, animationOptions);

    // Setup onComplete callback
    animation.onfinish = () => {
      if (config.onComplete) {
        config.onComplete(element);
      }
    };

    // Return animation controller
    return {
      play: () => animation.play(),
      pause: () => animation.pause(),
      cancel: () => animation.cancel(),
      finish: () => animation.finish(),
      reverse: () => animation.reverse(),
      stop: () => animation.cancel()
    };
  }

  // ENHANCED BUTTON ANIMATIONS

  // Basic button animations
  function pulse(element, options = {}) {
    return animate(element, {
      scale: [1, 1.05, 1]
    }, {
      duration: 300,
      ...options
    });
  }

  function bounce(element, options = {}) {
    return animate(element, {
      y: [0, -10, 0]
    }, {
      duration: 400,
      ...options
    });
  }

  function shimmer(element, options = {}) {
    // Create a shimmering effect with a pseudo-element
    // For the mock, we'll simulate it by changing the opacity
    return animate(element, {
      opacity: [1, 0.8, 1]
    }, {
      duration: 800,
      ...options
    });
  }

  // New dramatic button animations
  function jelly(element, options = {}) {
    return animate(element, {
      scale: [1, 1.25, 0.75, 1.15, 0.95, 1.05, 1]
    }, {
      duration: 800,
      easing: 'ease-out',
      ...options
    });
  }

  function vibrate(element, options = {}) {
    return animate(element, {
      x: [0, -2, 4, -6, 6, -4, 2, 0],
      y: [0, 2, -4, 6, -6, 4, -2, 0]
    }, {
      duration: 400,
      easing: 'linear',
      ...options
    });
  }

  function chaos(element, options = {}) {
    return animate(element, {
      x: [0, 5, -8, 10, -6, 3, 0],
      y: [0, -6, 4, -10, 8, -2, 0],
      rotate: [0, 5, -10, 15, -10, 5, 0],
      scale: [1, 1.05, 0.95, 1.1, 0.9, 1.02, 1]
    }, {
      duration: 800,
      easing: 'ease-out',
      ...options
    });
  }

  // ENHANCED TOAST ANIMATIONS

  function slideInBounce(element, options = {}) {
    const direction = options.direction || 'right';

    if (direction === 'right') {
      return animate(element, {
        x: [100, -15, 8, 0],
        opacity: [0, 1, 1, 1]
      }, {
        duration: 600,
        easing: 'ease-out',
        ...options
      });
    } else if (direction === 'bottom') {
      return animate(element, {
        y: [100, -15, 8, 0],
        opacity: [0, 1, 1, 1]
      }, {
        duration: 600,
        easing: 'ease-out',
        ...options
      });
    }
  }

  function zoomBurst(element, options = {}) {
    return animate(element, {
      scale: [0.5, 1.2, 0.9, 1.1, 1],
      opacity: [0, 1, 1, 1, 1],
      rotate: options.spin ? [-10, 5, -2, 0] : [0, 0, 0, 0]
    }, {
      duration: 700,
      easing: 'ease-out',
      ...options
    });
  }

  function wiggleIn(element, options = {}) {
    return animate(element, {
      x: [100, 0, -10, 5, -3, 0],
      rotate: [0, -5, 10, -7, 3, 0],
      opacity: [0, 1, 1, 1, 1, 1]
    }, {
      duration: 800,
      easing: 'ease-out',
      ...options
    });
  }

  function dropBounce(element, options = {}) {
    return animate(element, {
      y: [-100, 20, -10, 5, 0],
      opacity: [0, 1, 1, 1, 1],
      scale: [0.8, 1.05, 0.95, 1.02, 1]
    }, {
      duration: 800,
      easing: 'ease-out',
      ...options
    });
  }

  // ENHANCED DIALOG ANIMATIONS

  function explosiveZoom(element, options = {}) {
    const isHide = options.reverse === true;

    return animate(element, {
      scale: isHide ? [1, 0.5, 0] : [0, 1.15, 0.95, 1.05, 1],
      opacity: isHide ? [1, 0.8, 0] : [0, 1, 1, 1, 1],
      rotate: options.rotate ? [options.rotateStart || -5, 2, -1, 0] : [0, 0, 0, 0]
    }, {
      duration: 700,
      easing: 'ease-out',
      ...options
    });
  }

  function slam(element, options = {}) {
    const direction = options.direction || 'top';
    const isHide = options.reverse === true;

    let initialY = 0;
    let initialX = 0;

    switch(direction) {
      case 'top':
        initialY = -200;
        break;
      case 'bottom':
        initialY = 200;
        break;
      case 'left':
        initialX = -200;
        break;
      case 'right':
        initialX = 200;
        break;
    }

    if (isHide) {
      return animate(element, {
        opacity: [1, 0.5, 0],
        scale: [1, 0.9, 0.8],
        x: initialX !== 0 ? [0, initialX * 0.3, initialX] : [0, 0, 0],
        y: initialY !== 0 ? [0, initialY * 0.3, initialY] : [0, 0, 0]
      }, {
        duration: 400,
        easing: 'ease-in',
        ...options
      });
    } else {
      return animate(element, {
        opacity: [0, 1, 1],
        scale: [1.3, 0.97, 1],
        x: initialX !== 0 ? [initialX, 0, 0] : [0, 0, 0],
        y: initialY !== 0 ? [initialY, 0, 0] : [0, 0, 0]
      }, {
        duration: 600,
        easing: 'ease-out',
        ...options
      });
    }
  }

  function bounce3D(element, options = {}) {
    const isHide = options.reverse === true;

    if (isHide) {
      return animate(element, {
        scale: [1, 0.8, 0.5],
        opacity: [1, 0.6, 0],
        rotateX: [0, 20, 90]
      }, {
        duration: 500,
        easing: 'ease-in',
        ...options
      });
    } else {
      return animate(element, {
        scale: [0.5, 1.1, 0.9, 1.05, 1],
        opacity: [0, 1, 1, 1, 1],
        rotateX: [40, -20, 10, -5, 0]
      }, {
        duration: 800,
        easing: 'ease-out',
        ...options
      });
    }
  }

  // ENHANCED DROPDOWN ANIMATIONS

  function explosiveExpand(element, options = {}) {
    const isHide = options.reverse === true;

    if (!isHide) {
      // For demo purposes, assume the element has auto height we can use
      const originalHeight = element.scrollHeight;

      return animate(element, {
        height: [0, originalHeight * 1.1, originalHeight * 0.95, originalHeight],
        opacity: [0, 1]
      }, {
        duration: 500,
        easing: 'ease-out',
        ...options
      });
    } else {
      const currentHeight = element.offsetHeight;

      return animate(element, {
        height: [currentHeight, 0],
        opacity: [1, 0]
      }, {
        duration: 300,
        easing: 'ease-in',
        ...options
      });
    }
  }

  function cardDeck(element, options = {}) {
    // For demo, we'll just implement a basic version
    const items = element.querySelectorAll('.dropdown-item');

    if (items.length === 0) {
      return explosiveExpand(element, options);
    }

    const isHide = options.reverse === true;

    // Animate the container
    const currentHeight = element.offsetHeight;
    const autoHeight = element.scrollHeight;

    animate(element, {
      height: isHide ? [currentHeight, 0] : [0, autoHeight],
      opacity: isHide ? [1, 0] : [0, 1]
    }, {
      duration: 500,
      easing: isHide ? 'ease-in' : 'ease-out',
      ...options
    });

    // Animate each item
    items.forEach((item, index) => {
      const delay = isHide
        ? (items.length - 1 - index) * 60
        : index * 60;

      animate(item, {
        opacity: isHide ? [1, 0] : [0, 1],
        rotateX: isHide ? [0, 90] : [90, 0],
        y: isHide ? [0, -20] : [-20, 0]
      }, {
        duration: 400,
        delay: delay,
        easing: isHide ? 'ease-in' : 'ease-out'
      });
    });

    // Return a mock controller
    return {
      play: () => {},
      pause: () => {},
      stop: () => {}
    };
  }

  // FORM ANIMATIONS

  function shake(element, options = {}) {
    return animate(element, {
      x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0]
    }, {
      duration: 500,
      ...options
    });
  }

  function highlight(element, options = {}) {
    // Store original background
    const style = window.getComputedStyle(element);
    const originalBg = style.backgroundColor || 'transparent';

    // Create a temporary div that covers the element for the highlight effect
    const highlightElem = document.createElement('div');
    highlightElem.style.position = 'absolute';
    highlightElem.style.top = '0';
    highlightElem.style.left = '0';
    highlightElem.style.right = '0';
    highlightElem.style.bottom = '0';
    highlightElem.style.pointerEvents = 'none';
    highlightElem.style.backgroundColor = 'rgba(255, 250, 205, 0.5)';
    highlightElem.style.borderRadius = style.borderRadius;
    highlightElem.style.opacity = '0';

    // Add relative positioning to parent if needed
    if (style.position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(highlightElem);

    const anim = animate(highlightElem, {
      opacity: [0, 0.8, 0]
    }, {
      duration: 1000,
      onComplete: () => {
        highlightElem.remove();
        if (style.position === 'static') {
          element.style.position = '';
        }

        if (options.onComplete) {
          options.onComplete(element);
        }
      },
      ...options
    });

    return anim;
  }

  function successBounce(element, options = {}) {
    // For mock purposes, we'll just add a green border temporarily
    const originalBorder = element.style.border;
    element.style.border = '2px solid #10B981';

    const anim = animate(element, {
      y: [0, -5, 0]
    }, {
      duration: 300,
      onComplete: () => {
        setTimeout(() => {
          element.style.border = originalBorder;

          if (options.onComplete) {
            options.onComplete(element);
          }
        }, 1000);
      },
      ...options
    });

    return anim;
  }

  // LOADING ANIMATIONS

  function spinner(element, options = {}) {
    // For the mock, we'll just create a simple CSS spinner
    element.innerHTML = '';
    element.style.width = '30px';
    element.style.height = '30px';
    element.style.border = '3px solid rgba(0, 0, 0, 0.1)';
    element.style.borderTopColor = '#2563EB';
    element.style.borderRadius = '50%';

    return animate(element, {
      rotate: [0, 360]
    }, {
      duration: 1000,
      repeat: options.repeat || 0,
      ...options
    });
  }

  function dots(elements, options = {}) {
    // Handle both array of elements or container
    const dots = Array.isArray(elements) ? elements : Array.from(elements.querySelectorAll('.dot'));

    // Animate each dot with delay
    const animations = dots.map((dot, index) => {
      return animate(dot, {
        scale: [1, 1.5, 1],
        opacity: [0.5, 1, 0.5]
      }, {
        delay: index * 150,
        duration: 600,
        repeat: options.repeat || 0,
        ...options
      });
    });

    // Return controller that affects all dots
    return {
      play: () => animations.forEach(a => a.play()),
      pause: () => animations.forEach(a => a.pause()),
      stop: () => animations.forEach(a => a.stop())
    };
  }

  // TIMELINE IMPLEMENTATION

  function create() {
    const animations = [];

    return {
      add(animationFn, position = 0) {
        animations.push({
          fn: animationFn,
          position
        });
        return this;
      },

      play() {
        // Sort animations by position
        const sorted = [...animations].sort((a, b) => a.position - b.position);

        // Start each animation based on position
        sorted.forEach(anim => {
          setTimeout(() => {
            anim.fn();
          }, anim.position * 1000);
        });

        return this;
      },

      reverse() {
        // Sort animations in reverse order
        const sorted = [...animations]
          .sort((a, b) => b.position - a.position);

        // Start each animation based on position
        sorted.forEach(anim => {
          setTimeout(() => {
            const animation = anim.fn();
            if (animation.reverse) {
              animation.reverse();
            }
          }, (1 - anim.position) * 1000);
        });

        return this;
      }
    };
  }

  // UTILITY HELPERS

  function chain(animations) {
    let promise = Promise.resolve();

    animations.forEach(animFn => {
      promise = promise.then(() => {
        return new Promise(resolve => {
          const anim = animFn();
          if (anim && anim.onComplete) {
            const originalOnComplete = anim.onComplete;
            anim.onComplete = (...args) => {
              if (originalOnComplete) {
                originalOnComplete(...args);
              }
              resolve();
            };
          } else {
            setTimeout(resolve, 300);
          }
        });
      });
    });

    return promise;
  }

  function stagger(elements, animationCallback) {
    return Array.from(elements).map((element, index) => {
      return animationCallback(element, index);
    });
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Make the library available globally as turbulencejsMock
  global.turbulencejsMock = {
    animate,

    buttons: {
      pulse,
      bounce,
      shimmer,
      jelly,
      vibrate,
      chaos
    },

    forms: {
      shake,
      highlight,
      successBounce
    },

    toasts: {
      slideInBounce,
      zoomBurst,
      wiggleIn,
      dropBounce,
      slideIn: slideInBounce // alias for compatibility
    },

    dialogs: {
      explosiveZoom,
      slam,
      bounce3D,
      zoom: explosiveZoom // alias for compatibility
    },

    dropdowns: {
      explosiveExpand,
      cardDeck,
      expand: explosiveExpand // alias for compatibility
    },

    loading: {
      spinner,
      dots
    },

    timeline: {
      create
    },

    utils: {
      chain,
      stagger,
      random
    }
  };
})(window);
