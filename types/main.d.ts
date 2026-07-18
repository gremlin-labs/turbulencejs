export * from './index.js';

import turbulencejs from './index.js';
import type { Playable, Turbulence } from './runtime.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundsTarget {
  getBounds(): Rect;
  setBounds(bounds: Rect): void;
  isDestroyed?(): boolean;
}

export interface MainEngineOptions {
  fps?: number;
  reducedMotion?: boolean;
}

export interface MainAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: string | ((progress: number) => number);
  onComplete?: (value: unknown) => void;
  onCancel?: (value: unknown) => void;
}

export function createEngine(options?: MainEngineOptions): Turbulence;
export function safeSetBounds(target: BoundsTarget, bounds: Rect): boolean;

export class BoundsAnimator {
  constructor(engine: Turbulence);
  set(target: BoundsTarget, bounds: Rect): boolean;
  animate(target: BoundsTarget, bounds: Rect, options?: MainAnimationOptions): Playable<Rect>;
  isAnimating(target: BoundsTarget): boolean;
  cancel(target: BoundsTarget): void;
  cancelAll(): void;
  dispose(): void;
}

export type LayoutRects = Record<string, Rect>;
export type RegionApplier<State> = (rect: Rect, region: string, state: State) => void;

export class Layout<State = unknown> {
  constructor(engine: Turbulence, compute: (state: State) => LayoutRects, defaults?: MainAnimationOptions);
  state: State | null;
  readonly rects: LayoutRects | null;
  onRegion(name: string, callback: RegionApplier<State>): () => boolean;
  get(region: string): Rect | undefined;
  set(state: State): LayoutRects;
  animateTo(state: State, options?: MainAnimationOptions): Playable<LayoutRects>;
  cancel(): void;
  cancelAll(): void;
  dispose(): void;
}

declare const main: typeof turbulencejs & {
  createEngine: typeof createEngine;
  safeSetBounds: typeof safeSetBounds;
  BoundsAnimator: typeof BoundsAnimator;
  Layout: typeof Layout;
};

export default main;
