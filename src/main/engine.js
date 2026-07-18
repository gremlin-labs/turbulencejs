import { Turbulence, timerDriver } from 'turbulencejs';

export function createEngine({ fps = 60, reducedMotion = false } = {}) {
  return new Turbulence({ driver: timerDriver(fps), reducedMotion });
}
