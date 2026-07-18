import type { TurbNode } from 'turbulencejs';

export interface BubbleInOptions {
  mode?: 'together' | 'sequence';
  order?: Array<'appear' | 'rise' | 'expand' | 'settle'>;
  from?: 'left' | 'right' | 'top' | 'bottom';
  intensity?: number;
  duration?: number;
  rise?: number;
  startScale?: number;
  overshoot?: number;
  origin?: string;
}

export interface SkedaddleOptions {
  from?: 'left' | 'right' | 'top' | 'bottom';
  to?: 'left' | 'right' | 'top' | 'bottom';
  intensity?: number;
  duration?: number;
  distance?: number | ((target: HTMLElement, direction: string) => number);
  cycles?: number;
}

export function bubbleIn(options?: BubbleInOptions): TurbNode;
export function bubbleInParts(options?: BubbleInOptions): Readonly<Record<'appear' | 'rise' | 'expand' | 'settle', TurbNode>>;
export const skedaddle: Readonly<{
  in(options?: SkedaddleOptions): TurbNode;
  out(options?: SkedaddleOptions): TurbNode;
}>;

declare const cartoon: Readonly<{ bubbleIn: typeof bubbleIn; bubbleInParts: typeof bubbleInParts; skedaddle: typeof skedaddle }>;
export default cartoon;
