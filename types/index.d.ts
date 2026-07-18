export * from './runtime.js';

export type EasingFunction = (progress: number) => number;
export type Easing = string | EasingFunction;
export type AnimationValue = number | string;
export type AnimationProperties = Record<string, AnimationValue | AnimationValue[]>;

export interface AnimationOptions {
  duration?: number;
  easing?: Easing;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  autoplay?: boolean;
  respectReducedMotion?: boolean;
  reducedMotion?: boolean;
  onStart?: (element: HTMLElement) => void;
  onUpdate?: (element: HTMLElement, progress: number, iteration: number) => void;
  onComplete?: (element: HTMLElement) => void;
  onCancel?: (element: HTMLElement) => void;
  [option: string]: unknown;
}

export interface AnimationController {
  readonly id: number;
  readonly state: string;
  play(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  reverse(): void;
}

export interface TimelineController {
  readonly duration: number;
  readonly currentTime: number;
  add(animation: AnimationController, offset?: number | `+=${number}` | `-=${number}`): TimelineController;
  play(): TimelineController;
  pause(): TimelineController;
  resume(): TimelineController;
  stop(): TimelineController;
  finish(): TimelineController;
  reverse(): TimelineController;
  seek(time: number): TimelineController;
  setTimeScale(scale: number): TimelineController;
  onComplete(callback: () => void): TimelineController;
  onUpdate(callback: (progress: number, time: number) => void): TimelineController;
}

export interface SpringOptions extends AnimationOptions {
  mass?: number;
  stiffness?: number;
  damping?: number;
  velocity?: number;
  precision?: number;
}

export interface SpringController {
  readonly state: string;
  stop(): void;
  retarget(target: number): SpringController;
}

export interface PathOptions extends AnimationOptions {
  rotate?: boolean;
  rotateOffset?: number;
  offset?: { x: number; y: number };
}

export interface MotionRole {
  readonly duration: number;
  readonly easing: string;
  readonly reducedMotion: 'instant';
}

export type Preset = (...arguments_: any[]) => any;
export type PresetCollection = Record<string, Preset>;

export interface TurbNode {
  readonly type: string;
}

export interface TurbContext<T extends HTMLElement = HTMLElement, C = unknown> {
  readonly target: T;
  readonly index: number;
  readonly count: number;
  readonly context: C;
  readonly random: () => number;
}

export interface TurbLifecycleScope {
  readonly signal: AbortSignal;
  cleanup(callback: () => void): () => void;
  listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): EventListenerOrEventListenerObject;
  timeout(callback: () => void, delay?: number): ReturnType<typeof setTimeout>;
  interval(callback: () => void, delay?: number): ReturnType<typeof setInterval>;
  resource(type: string, count?: number): void;
}

export interface TurbDriverContext<T extends HTMLElement = HTMLElement, C = unknown> extends TurbContext<T, C> {
  readonly lifecycle: TurbLifecycleScope;
}

export interface TurbDriverFrameContext<T extends HTMLElement = HTMLElement, C = unknown> extends TurbDriverContext<T, C> {
  readonly element: T;
  readonly time: number;
  readonly previousTime: number;
  readonly direction: 1 | -1;
}

export interface TurbDriverImplementation<T extends HTMLElement = HTMLElement, C = unknown> {
  render(progress: number, context: TurbDriverFrameContext<T, C>): void;
  start?(context: TurbDriverFrameContext<T, C>): void;
  finish?(context: TurbDriverFrameContext<T, C>): void;
  cancel?(context: TurbDriverFrameContext<T, C>): void;
  cleanup?(): void;
  easing?: Easing;
  capabilities?: Partial<Record<'reversible' | 'seekable' | 'pausable' | 'finishable', boolean>>;
  diagnostics?: Readonly<Record<string, string | number>>;
  resources?: Readonly<Record<string, number>>;
}

export interface TurbDriverOptions extends AnimationOptions {
  duration: number;
  reversible?: boolean;
  seekable?: boolean;
  pausable?: boolean;
  finishable?: boolean;
}

export interface TurbMarkEvent {
  readonly name: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly time: number;
}

export type TurbFactory<T extends HTMLElement = HTMLElement, C = unknown> =
  (target: T, index: number, context: TurbContext<T, C>) => TurbNode;
export type TurbTarget<T extends HTMLElement = HTMLElement> =
  | T
  | Iterable<T | { target: T; slots?: Record<string, HTMLElement | string | ((target: T) => HTMLElement | null)> }>
  | string
  | ((options?: TurbPlayOptions) => T | Iterable<T> | null | undefined);

export interface TurbPlayOptions {
  root?: Document | Element;
  context?: unknown;
  seed?: string | number;
  autoplay?: boolean;
  respectReducedMotion?: boolean;
  reducedMotion?: boolean;
  onStart?: (performance: TurbPerformance) => void;
  onComplete?: (performance: TurbPerformance) => void;
  onCancel?: (performance: TurbPerformance) => void;
  onError?: (error: unknown, performance: TurbPerformance) => void;
}

export interface TurbCapabilities {
  readonly pause: boolean;
  readonly reverse: boolean;
  readonly seek: boolean;
  readonly stop: true;
  readonly reset: true;
  readonly finish: boolean;
  readonly replay: true;
}

export interface TurbPerformance {
  readonly state: string;
  readonly duration: number;
  readonly seed: string | number;
  readonly capabilities: TurbCapabilities;
  readonly diagnostics: Readonly<Record<string, string | number>>;
  play(): TurbPerformance;
  pause(): TurbPerformance;
  resume(): TurbPerformance;
  stop(): TurbPerformance;
  reset(): TurbPerformance;
  finish(): TurbPerformance;
  replay(): TurbPerformance;
  reseed(seed?: string | number): TurbPerformance;
  reverse(): TurbPerformance;
  seek(time: number, options?: { emitMarks?: boolean }): TurbPerformance;
  on(event: 'mark', handler: (event: TurbMarkEvent, performance: TurbPerformance) => void): () => boolean;
}

export interface TurbScript {
  readonly recipe: TurbNode;
  play<T extends HTMLElement = HTMLElement>(targets: TurbTarget<T>, options?: TurbPlayOptions): TurbPerformance;
}

export interface TurbGrammar {
  track(properties: AnimationProperties, options?: AnimationOptions & { role?: string }): TurbNode;
  driver<T extends HTMLElement = HTMLElement, C = unknown>(
    factory: (context: TurbDriverContext<T, C>) => TurbDriverImplementation<T, C> | TurbDriverImplementation<T, C>['render'],
    options: TurbDriverOptions
  ): TurbNode;
  mark(name: string, metadata?: Readonly<Record<string, unknown>>): TurbNode;
  sequence(...children: Array<TurbNode | TurbNode[]>): TurbNode;
  parallel(...children: Array<TurbNode | TurbNode[]>): TurbNode;
  wait(duration: number): TurbNode;
  at(offset: number, child: TurbNode): TurbNode;
  each<T extends HTMLElement = HTMLElement, C = unknown>(factory: TurbFactory<T, C>): TurbNode;
  stagger<T extends HTMLElement = HTMLElement, C = unknown>(step: number, child: TurbNode | TurbFactory<T, C>): TurbNode;
  cycle(...children: Array<TurbNode | TurbNode[]>): TurbNode;
  choose(children: TurbNode[], options?: { seed?: string | number }): TurbNode;
  shuffle(child: TurbNode): TurbNode;
  slot(name: string, child: TurbNode): TurbNode;
  effect(setup: (context: TurbContext) => void | (() => void), child: TurbNode, options?: Record<string, unknown>): TurbNode;
  define<T extends (...arguments_: any[]) => TurbNode>(name: string, factory: T): T & { readonly recipeName: string };
  isTurb(value: unknown): value is TurbNode;
}

export interface TurbDirector<T extends HTMLElement = HTMLElement> {
  using(value: TurbNode | TurbFactory<T>): TurbDirector<T>;
  then(value: TurbNode | TurbFactory<T>): TurbDirector<T>;
  together(value: TurbNode | TurbFactory<T>): TurbDirector<T>;
  stagger(step: number): TurbDirector<T>;
  seed(seed: string | number): TurbDirector<T>;
  compile(): TurbNode;
  play(options?: TurbPlayOptions): TurbPerformance;
}

export function animate(element: HTMLElement, properties: AnimationProperties, options?: AnimationOptions): AnimationController;
export function stop(id: number): void;
export function pause(id: number): void;
export function resume(id: number): void;
export const turb: TurbGrammar;
export function script(recipe: TurbNode): TurbScript;
export function direct<T extends HTMLElement = HTMLElement>(targets: TurbTarget<T>): TurbDirector<T>;

export const buttons: PresetCollection;
export const forms: PresetCollection;
export const toasts: PresetCollection;
export const dialogs: PresetCollection;
export const dropdowns: PresetCollection;
export const loading: PresetCollection;
export const timeline: { create(options?: Record<string, unknown>): TimelineController };
export interface EasingCollection {
  [name: string]: (...arguments_: any[]) => any;
  createEasing(name: Easing, ...parameters: number[]): EasingFunction;
}
export const easing: EasingCollection;
export const motion: {
  roles: Record<string, MotionRole>;
  options(role: string, options?: AnimationOptions, overrides?: AnimationOptions): AnimationOptions;
};
export const spring: {
  to(element: HTMLElement, property: string, target: number, options?: SpringOptions): SpringController;
  create(options?: SpringOptions): unknown;
  wobbly(options?: SpringOptions): SpringOptions;
  bouncy(options?: SpringOptions): SpringOptions;
  gentle(options?: SpringOptions): SpringOptions;
};
export const path: {
  follow(element: HTMLElement, path: string, options?: PathOptions): { readonly state: string; stop(): void };
  create(points: Array<{ x: number; y: number }>, closed?: boolean): string;
};
export const utils: Record<string, unknown>;
export const VERSION: string;
export * as runtime from './runtime.js';

declare const turbulencejs: {
  animate: typeof animate;
  stop: typeof stop;
  pause: typeof pause;
  resume: typeof resume;
  buttons: typeof buttons;
  forms: typeof forms;
  toasts: typeof toasts;
  dialogs: typeof dialogs;
  dropdowns: typeof dropdowns;
  loading: typeof loading;
  timeline: typeof timeline;
  easing: typeof easing;
  motion: typeof motion;
  spring: typeof spring;
  path: typeof path;
  utils: typeof utils;
  turb: typeof turb;
  script: typeof script;
  direct: typeof direct;
  VERSION: typeof VERSION;
  runtime: typeof import('./runtime.js');
  Turbulence: typeof import('./runtime.js').Turbulence;
  Tween: typeof import('./runtime.js').Tween;
  Spring: typeof import('./runtime.js').Spring;
  Ticker: typeof import('./runtime.js').Ticker;
  rafDriver: typeof import('./runtime.js').rafDriver;
  timerDriver: typeof import('./runtime.js').timerDriver;
  manualDriver: typeof import('./runtime.js').manualDriver;
  interpolate: typeof import('./runtime.js').interpolate;
  sequence: typeof import('./runtime.js').sequence;
  parallel: typeof import('./runtime.js').parallel;
  stagger: typeof import('./runtime.js').stagger;
};
export default turbulencejs;
