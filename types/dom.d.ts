export * from './index.js';

import turbulencejs from './index.js';
import type { Driver, PlayableResult, Turbulence } from './runtime.js';

export interface DomEngineOptions {
  driver?: Driver;
  reducedMotion?: boolean;
}

export interface DomAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: string | ((progress: number) => number);
  from?: Record<string, unknown>;
}

export interface DomAnimationHandle {
  readonly finished: Promise<Pick<PlayableResult, 'finished' | 'cancelled'>>;
  cancel(): void;
}

export type DomAnimationProperties = Partial<Record<'x' | 'y' | 'scale' | 'rotate' | 'opacity' | string, unknown>>;

export function createEngine(options?: DomEngineOptions): Turbulence;
export function detectReducedMotion(): boolean;
export function transformCss(transform: { x: number; y: number; scale: number; rotate: number }): string;

export class DomAnimator {
  constructor(engine: Turbulence);
  set(element: Element, properties: DomAnimationProperties): void;
  animate(element: Element, properties: DomAnimationProperties, options?: DomAnimationOptions): DomAnimationHandle;
  cancelAll(): void;
  dispose(): void;
}

declare const dom: typeof turbulencejs & {
  createEngine: typeof createEngine;
  detectReducedMotion: typeof detectReducedMotion;
  transformCss: typeof transformCss;
  DomAnimator: typeof DomAnimator;
};

export default dom;
