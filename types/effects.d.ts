import type { TurbNode } from './index.js';
import type { SurfaceProgramOptions, SurfaceSourceDescriptor } from './surfaces.js';

export interface SnaporateOptions extends SurfaceProgramOptions {
  fidelity?: 'invaders' | 'blocks' | 'pixel';
  direction?: 'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'down-left' | 'down-right' | { x: number; y: number };
  wind?: SnaporateOptions['direction'];
  gravity?: number;
  turbulence?: number;
  distance?: number;
  fade?: boolean;
  order?: 'random' | 'left-to-right' | 'top-to-bottom';
  samples?: number;
}

export interface EnhanceStage {
  src?: string;
  image?: HTMLImageElement;
  resolution?: number;
}

export interface EnhanceOptions {
  duration?: number;
  easing?: string;
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  fallback?: string | HTMLImageElement | EnhanceStage;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  position?: string;
  scan?: boolean;
  zIndex?: number;
  content?: 'existing' | 'replace-at-mark';
  markName?: string;
  onStageLoad?(event: { index: number; resolution: number; target: HTMLElement }): void;
  onStageError?(event: { index: number; resolution: number; target: HTMLElement; error: unknown }): void;
}

export interface CoordinatedRecipeOptions {
  delay?: number;
  stagger?: number;
  order?: 'stable' | 'reverse' | 'shuffle';
  seed?: string | number;
  ownerIndex?: number;
}

export interface SidebarReadyOptions extends CoordinatedRecipeOptions {
  arrival?: TurbNode | ((target: HTMLElement, index: number, context: unknown) => TurbNode);
  arrivalDuration?: number;
  arrivalEasing?: string;
  from?: 'left' | 'right';
  itemSlot?: string;
  contentSlot?: string;
  parentSlot?: string;
  finish?: 'sweep' | 'glow' | 'settle' | 'mixed' | 'custom' | 'none';
  finishDuration?: number;
  finishStagger?: number;
  final?: TurbNode | ((target: HTMLElement, index: number, context: unknown) => TurbNode);
  sweep?: { duration?: number; easing?: string; color?: string; blendMode?: string; zIndex?: number };
  arrivedMark?: string;
  readyMark?: string;
}

export interface TetrisLoadOptions extends CoordinatedRecipeOptions {
  arrival?: TurbNode | ((target: HTMLElement, index: number, context: unknown) => TurbNode);
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  dropDuration?: number;
  collisionDuration?: number;
  dropEasing?: string;
  blockSlot?: string;
  contentSlot?: string;
  contentStagger?: number;
  contentDuration?: number;
  groupSlot?: string;
  content?: 'existing' | 'replace-at-mark';
  win?: 'flash' | 'flash-reveal' | 'reveal' | 'settle' | 'custom' | 'none';
  final?: TurbNode | ((target: HTMLElement, index: number, context: unknown) => TurbNode);
  flash?: { duration?: number; easing?: string; color?: string; blendMode?: string; zIndex?: number };
  landedMark?: string;
  winMark?: string;
}

export const snaporate: {
  in(source: SurfaceSourceDescriptor, options?: SnaporateOptions): TurbNode;
  out(source: SurfaceSourceDescriptor, options?: SnaporateOptions): TurbNode;
  program(source: SurfaceSourceDescriptor, options?: SnaporateOptions & { mode?: 'in' | 'out' }): TurbNode;
};
export function enhance(stages: Array<string | HTMLImageElement | EnhanceStage>, options?: EnhanceOptions): TurbNode;
export function sidebarReady(options?: SidebarReadyOptions): TurbNode;
export function tetrisLoad(options?: TetrisLoadOptions): TurbNode;
declare const turbulence: { snaporate: typeof snaporate; enhance: typeof enhance; sidebarReady: typeof sidebarReady; tetrisLoad: typeof tetrisLoad };
export default turbulence;
