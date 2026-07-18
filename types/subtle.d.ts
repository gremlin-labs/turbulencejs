import type { AnimationOptions, TurbNode } from 'turbulencejs';
import type { BubbleInOptions } from 'turbulencejs/cartoon';
import type { CinematicSlideOptions } from 'turbulencejs/cinematic';

export function softReveal(options?: BubbleInOptions): TurbNode;
export function quietSlide(options?: CinematicSlideOptions): TurbNode;
export function gentleSettle(options?: AnimationOptions): TurbNode;

declare const subtle: Readonly<{ softReveal: typeof softReveal; quietSlide: typeof quietSlide; gentleSettle: typeof gentleSettle }>;
export default subtle;
