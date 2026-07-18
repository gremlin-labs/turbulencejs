import type { TurbNode } from 'turbulencejs';
import type { BubbleInOptions, SkedaddleOptions } from 'turbulencejs/cartoon';
import type { Card3DOptions } from 'turbulencejs/cinematic';

export function impactBubble(options?: BubbleInOptions): TurbNode;
export const panicSkedaddle: Readonly<{
  in(options?: SkedaddleOptions): TurbNode;
  out(options?: SkedaddleOptions): TurbNode;
}>;
export function spinAway(options?: Card3DOptions): TurbNode;

declare const extreme: Readonly<{ impactBubble: typeof impactBubble; panicSkedaddle: typeof panicSkedaddle; spinAway: typeof spinAway }>;
export default extreme;
