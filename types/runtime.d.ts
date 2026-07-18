export type DriverHandle = unknown;

export interface Driver {
  schedule(callback: (now: number) => void): DriverHandle;
  cancel(handle: DriverHandle): void;
}

export interface ManualDriver extends Driver {
  step(milliseconds: number): boolean;
  readonly now: number;
  readonly hasPending: boolean;
}

export interface PlayableResult<T = unknown> {
  finished: boolean;
  cancelled: boolean;
  value?: T;
}

export interface Playable<T = unknown> {
  readonly finished: Promise<PlayableResult<T>>;
  cancel(): this | void;
}

export class Ticker {
  constructor(driver: Driver);
  readonly running: boolean;
  readonly size: number;
  add(callback: (delta: number, now: number) => void): () => void;
  remove(callback: (delta: number, now: number) => void): void;
}

export interface TweenOptions<T> {
  from: T;
  to: T;
  duration?: number;
  delay?: number;
  easing?: string | ((progress: number) => number);
  onUpdate?: (value: T, tween: Tween<T>) => void;
  onComplete?: (value: T) => void;
  onCancel?: (value: T) => void;
}

export class Tween<T = unknown> implements Playable<T> {
  constructor(ticker: Ticker, options: TweenOptions<T>);
  readonly id: string;
  readonly value: T;
  readonly playing: boolean;
  readonly progress: number;
  readonly target: T;
  readonly finished: Promise<PlayableResult<T>>;
  start(): this;
  retarget(target: T, options?: Pick<TweenOptions<T>, 'duration' | 'easing'>): this;
  pause(): this;
  resume(): this;
  finish(): this;
  cancel(): this;
}

export interface SpringRuntimeOptions<T> {
  from: T;
  to: T;
  stiffness?: number;
  damping?: number;
  mass?: number;
  restDelta?: number;
  restSpeed?: number;
  onUpdate?: (value: T, spring: Spring<T>) => void;
  onComplete?: (value: T) => void;
  onCancel?: (value: T) => void;
}

export class Spring<T = number | Record<string, number>> implements Playable<T> {
  constructor(ticker: Ticker, options: SpringRuntimeOptions<T>);
  readonly value: T;
  readonly playing: boolean;
  readonly finished: Promise<PlayableResult<T>>;
  start(): this;
  retarget(target: T): this;
  finish(): this;
  cancel(): this;
}

export class Turbulence {
  constructor(options: { driver: Driver; reducedMotion?: boolean });
  readonly ticker: Ticker;
  reducedMotion: boolean;
  readonly activeCount: number;
  readonly idle: boolean;
  tween<T>(options: TweenOptions<T>): Tween<T>;
  spring<T extends number | Record<string, number>>(options: SpringRuntimeOptions<T>): Spring<T> | Tween<T>;
  sequence(factories: Array<() => Playable>): Playable;
  parallel(factories: Array<() => Playable>): Playable;
  stagger<T>(items: T[], makePlayable: (item: T, index: number) => Playable, staggerMilliseconds?: number): Playable;
  dispose(): void;
}

export const MAX_DT: number;
export function rafDriver(): Driver;
export function timerDriver(fps?: number): Driver;
export function manualDriver(start?: number): ManualDriver;
export function clamp01(progress: number): number;
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (progress: number) => number;
export const named: Record<string, (progress: number) => number>;
export function resolve(easing?: string | ((progress: number) => number)): (progress: number) => number;
export function lerp(a: number, b: number, progress: number): number;
export function lerpRect<T extends { x: number; y: number; width: number; height: number }>(a: T, b: T, progress: number): T;
export function roundRect<T extends { x: number; y: number; width: number; height: number }>(rect: T): T;
export function isRect(value: unknown): boolean;
export function parseColor(value: string): [number, number, number, number] | null;
export function formatColor(value: [number, number, number, number]): string;
export function interpolate<T>(from: T, to: T): (progress: number) => T;
export function sequence(factories: Array<() => Playable>): Playable;
export function parallel(factories: Array<() => Playable>): Playable;
export function stagger<T>(ticker: Ticker, items: T[], makePlayable: (item: T, index: number) => Playable, staggerMilliseconds?: number): Playable;

declare const runtime: {
  Turbulence: typeof Turbulence;
  Tween: typeof Tween;
  Spring: typeof Spring;
  Ticker: typeof Ticker;
  rafDriver: typeof rafDriver;
  timerDriver: typeof timerDriver;
  manualDriver: typeof manualDriver;
  interpolate: typeof interpolate;
  sequence: typeof sequence;
  parallel: typeof parallel;
  stagger: typeof stagger;
};

export default runtime;
