// src/index.js - Main entry file for Turbulence

// Import core functionality
import { animate, stop, pause, resume } from './core/engine';

// Import animation collections
import * as buttonsModule from './animations/buttons';
import * as formsModule from './animations/forms';
import * as toastsModule from './animations/toasts';
import * as dialogsModule from './animations/dialogs';
import * as dropdownsModule from './animations/dropdowns';
import * as loadingModule from './animations/loading';

// Import timeline
import * as timelineModule from './core/timeline';

// Import easing functions
import * as easingModule from './core/easing';
import * as motionModule from './core/motion';

// Import utility functions
import * as utilsModule from './utils';

// Import spring physics
import * as springModule from './utils/spring';

// Import path animations
import * as pathModule from './utils/path';
import { turb, script, direct } from './turbscript';
import * as runtimeModule from './runtime';

// Named exports
export const buttons = buttonsModule;
export const forms = formsModule;
export const toasts = toastsModule;
export const dialogs = dialogsModule;
export const dropdowns = dropdownsModule;
export const loading = loadingModule;
export const timeline = timelineModule;
export const easing = {
  ...easingModule,
  resolve: runtimeModule.resolve,
  cubicBezier: runtimeModule.cubicBezier,
  named: runtimeModule.named,
  clamp01: runtimeModule.clamp01
};
export const motion = { roles: motionModule.motionRoles, options: motionModule.motionOptions };
export const utils = utilsModule;

export const spring = {
  to: springModule.springTo,
  wobbly: springModule.wobbly,
  bouncy: springModule.bouncy,
  gentle: springModule.gentle,
  create: springModule.createSpring
};

export const path = {
  follow: pathModule.followPath,
  create: pathModule.createPath
};

// Re-export core functionality
export { animate, stop, pause, resume };
export { turb, script, direct };
export const VERSION = '2.0.0';
export const runtime = runtimeModule;
export const {
  Turbulence,
  Tween,
  Spring,
  Ticker,
  rafDriver,
  timerDriver,
  manualDriver,
  MAX_DT,
  resolve,
  cubicBezier,
  named,
  clamp01,
  interpolate,
  lerp,
  lerpRect,
  roundRect,
  isRect,
  parseColor,
  formatColor,
  sequence,
  parallel,
  stagger
} = runtimeModule;

// Create and export default object containing all exports
const turbulencejs = {
  animate,
  stop,
  pause,
  resume,
  buttons,
  forms,
  toasts,
  dialogs,
  dropdowns,
  loading,
  timeline,
  easing,
  motion,
  utils,
  spring,
  path,
  turb,
  script,
  direct,
  VERSION,
  runtime,
  Turbulence,
  Tween,
  Spring,
  Ticker,
  rafDriver,
  timerDriver,
  manualDriver,
  MAX_DT,
  resolve,
  cubicBezier,
  named,
  clamp01,
  interpolate,
  lerp,
  lerpRect,
  roundRect,
  isRect,
  parseColor,
  formatColor,
  sequence,
  parallel,
  stagger
};

export default turbulencejs;
