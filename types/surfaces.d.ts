import type { Easing, TurbNode } from './index.js';

export type SurfaceSourceType = 'image' | 'canvas' | 'image-bitmap' | 'image-data';
export type SurfaceErrorCode =
  | 'SURFACE_UNSUPPORTED_INPUT'
  | 'SURFACE_SOURCE_NOT_READY'
  | 'SURFACE_ZERO_AREA'
  | 'SURFACE_TAINTED_PIXELS'
  | 'SURFACE_ALLOCATION_FAILED'
  | 'SURFACE_ABORTED'
  | 'SURFACE_CONTEXT_LOST'
  | 'SURFACE_POLICY_REJECTED';

export class SurfaceError extends Error {
  readonly code: SurfaceErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface SurfaceSourceDescriptor {
  readonly type: SurfaceSourceType;
  readonly value: HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData;
}

export interface SurfacePolicyOptions {
  maxCssWidth?: number;
  maxCssHeight?: number;
  maxRasterWidth?: number;
  maxRasterHeight?: number;
  maxDpr?: number;
  maxSamples?: number;
  maxParticles?: number;
  maxDomBlocks?: number;
  maxAllocationBytes?: number;
  maxWorkerBacklog?: number;
  mode?: 'degrade' | 'reject';
}

export interface AppliedSurfacePolicy {
  readonly policy: Readonly<Required<SurfacePolicyOptions>>;
  readonly requested: Readonly<Record<string, number>>;
  readonly applied: Readonly<Record<string, number>>;
  readonly degradations: ReadonlyArray<Readonly<{ field: string; requested: number; applied: number; reason: string }>>;
}

export interface ResolvedSurfaceSource {
  readonly type: SurfaceSourceType;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
  readonly originClean: true;
  readonly policy: AppliedSurfacePolicy;
}

export interface SurfaceRenderer {
  readonly type?: string;
  readonly resources?: Readonly<Record<string, number>>;
  render(progress: number, context?: unknown): void;
  dispose(): void;
}

export type SurfaceRendererFactory = (input: {
  canvas: HTMLCanvasElement;
  source: ResolvedSurfaceSource;
  seed?: string | number;
  mode: 'in' | 'out';
  context: unknown;
}) => SurfaceRenderer;

export interface SurfaceProgramOptions extends Omit<SurfacePolicyOptions, 'mode'> {
  duration?: number;
  easing?: Easing;
  mode?: 'in' | 'out';
  visibility?: 'endpoint' | 'preserve';
  dpr?: number;
  samples?: number;
  particles?: number;
  domBlocks?: number;
  workerBacklog?: number;
  policy?: SurfacePolicyOptions;
  seed?: string | number;
  zIndex?: number;
  clip?: boolean;
  container?: Element;
  reversible?: boolean;
  seekable?: boolean;
  renderer?: 'auto' | 'canvas2d' | 'dom-blocks' | 'webgl2' | 'worker';
  strictRenderer?: boolean;
  workerFactory?: () => Worker;
}

export interface ElementCaptureOptions {
  assets?: 'none' | 'same-origin' | 'cors';
  unsupported?: 'reject' | 'omit';
  fonts?: 'ready' | 'skip';
  timeout?: number;
  dpr?: number;
  policy?: SurfacePolicyOptions;
  signal?: AbortSignal;
  credentials?: 'omit' | 'same-origin';
  assetFailure?: 'reject' | 'omit';
  maxAssetBytes?: number;
}

export const source: {
  image(value: HTMLImageElement): SurfaceSourceDescriptor;
  canvas(value: HTMLCanvasElement): SurfaceSourceDescriptor;
  imageBitmap(value: ImageBitmap): SurfaceSourceDescriptor;
  imageData(value: ImageData): SurfaceSourceDescriptor;
  from(value: SurfaceSourceDescriptor | HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData): SurfaceSourceDescriptor;
};
export function isSurfaceSource(value: unknown): value is SurfaceSourceDescriptor;
export function resolveSurfaceSource(input: SurfaceSourceDescriptor, options?: SurfaceProgramOptions & { signal?: AbortSignal }): ResolvedSurfaceSource;
export function createSurfacePolicy(options?: SurfacePolicyOptions): Readonly<Required<SurfacePolicyOptions>>;
export function applySurfacePolicy(request: Record<string, number>, options?: SurfacePolicyOptions): AppliedSurfacePolicy;
export function createCanvas2DRenderer(input: Parameters<SurfaceRendererFactory>[0]): SurfaceRenderer;
export function createDOMBlocksRenderer(input: Parameters<SurfaceRendererFactory>[0]): SurfaceRenderer;
export function createWebGL2Renderer(input: Parameters<SurfaceRendererFactory>[0]): SurfaceRenderer;
export function createWorkerRenderer(input: Parameters<SurfaceRendererFactory>[0]): SurfaceRenderer;
export function createSurfaceRenderer(input: Parameters<SurfaceRendererFactory>[0]): SurfaceRenderer;
export const renderers: Readonly<Record<string, SurfaceRendererFactory>>;
export function captureElement(element: Element, options?: ElementCaptureOptions): Promise<{
  readonly source: SurfaceSourceDescriptor;
  readonly diagnostics: Readonly<Record<string, unknown>>;
}>;
export function program(
  input: SurfaceSourceDescriptor | ((context: unknown) => SurfaceSourceDescriptor),
  rendererFactory?: SurfaceRendererFactory,
  options?: SurfaceProgramOptions
): TurbNode;
export const dissolve: {
  in(input: SurfaceSourceDescriptor, options?: SurfaceProgramOptions): TurbNode;
  out(input: SurfaceSourceDescriptor, options?: SurfaceProgramOptions): TurbNode;
};
export const surface: Readonly<Record<string, unknown>>;
export default surface;
