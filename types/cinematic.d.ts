import type { TurbNode } from 'turbulencejs';

export type CardDirection = 'top' | 'bottom' | 'left' | 'right' | 'northWest' | 'northEast' | 'southWest' | 'southEast';
export interface Card3DOptions {
  from?: CardDirection;
  to?: CardDirection;
  intensity?: number;
  duration?: number;
  depth?: number;
  spin?: number;
  perspective?: number;
  origin?: string;
  easing?: string;
  host?: HTMLElement | ((target: HTMLElement) => HTMLElement | null);
}
export type SlideAnchor = 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
export interface CinematicSlideOptions {
  anchor?: SlideAnchor;
  duration?: number;
  contentDuration?: number;
  content?: 'with' | 'after' | TurbNode;
  contentSlot?: string;
}

export const card3D: Readonly<{
  in(options?: Card3DOptions): TurbNode;
  out(options?: Card3DOptions): TurbNode;
}>;
export const cinematicSlide: Readonly<{
  in(options?: CinematicSlideOptions): TurbNode;
  out(options?: CinematicSlideOptions): TurbNode;
}>;

declare const cinematic: Readonly<{ card3D: typeof card3D; cinematicSlide: typeof cinematicSlide }>;
export default cinematic;
