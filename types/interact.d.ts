import type { TurbNode, TurbPerformance } from './index.js';

export type InteractionState = 'active' | 'suspended' | 'settling' | 'cancelled' | 'destroyed';

export interface InteractionDiagnostics {
  readonly state: InteractionState;
  readonly targetCount: number;
  readonly listenerCount: number;
  readonly activePerformances: number;
  readonly liveValueCount: number;
  readonly capturedPointerCount: number;
  readonly lastPointerType: string;
  readonly cleanupCount: number;
  readonly destroyed: number;
}

export interface InteractionSession {
  readonly state: InteractionState;
  readonly signal: AbortSignal;
  readonly diagnostics: InteractionDiagnostics;
  setState(state: InteractionState): InteractionSession;
  cleanup(callback: () => void): () => void;
  listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): EventListenerOrEventListenerObject;
  ownPerformance(performance: TurbPerformance): TurbPerformance;
  releasePerformance(performance: TurbPerformance): void;
  ownStyle(target: HTMLElement, properties: string[]): void;
  ownAttribute(target: Element, name: string): void;
  capturePointer(target: Element, pointerId: number): void;
  releasePointer(pointerId: number): void;
  addTarget(target: Element): InteractionSession;
  removeTarget(target: Element): InteractionSession;
  setLiveValue(name: string, value: unknown): InteractionSession;
  getLiveValue(name: string): unknown;
  rememberFocus(target?: HTMLElement | null): InteractionSession;
  setLastPointerType(value: string): InteractionSession;
  suspend(): InteractionSession;
  resume(): InteractionSession;
  cancel(): InteractionSession;
  destroy(): InteractionSession;
}

export interface InteractionSessionOptions {
  signal?: AbortSignal;
  restoreFocus?: boolean;
  onStateChange?(state: InteractionState, session: InteractionSession): void;
  onDestroy?(session: InteractionSession): void;
  onError?(error: unknown, session: InteractionSession): void;
}

export type HoverRecipe = TurbNode | ((target: HTMLElement, index: number, context: {
  target: HTMLElement; index: number; count: number; context: unknown; phase: 'enter' | 'leave';
}) => TurbNode);

export interface HoverOptions extends InteractionSessionOptions {
  enter: HoverRecipe;
  leave?: HoverRecipe;
  interruption?: 'reverse' | 'restart' | 'finish' | 'ignore' | 'queue-latest';
  touch?: 'ignore' | 'allow';
  focus?: boolean;
  forceHover?: boolean;
  delegate?: boolean;
  ownership?: 'shared' | 'independent';
  root?: Document | Element;
  view?: Window;
  seed?: string | number;
  context?: unknown;
  respectReducedMotion?: boolean;
  reducedMotion?: boolean;
}

export type DragState = 'idle' | 'armed' | 'lifted' | 'dragging' | 'validating' | 'settling' | 'committed' | 'rejected' | 'cancelled' | 'destroyed';

export interface DragEventContext {
  readonly target: HTMLElement;
  readonly visual: HTMLElement;
  readonly position: Readonly<{ x: number; y: number }>;
  readonly velocity: Readonly<{ x: number; y: number }>;
  readonly keyboard: boolean;
  readonly zone?: HTMLElement | null;
  readonly signal?: AbortSignal;
  readonly error?: unknown;
  readonly reason?: string;
}

export interface DragOptions extends InteractionSessionOptions {
  axis?: 'x' | 'y';
  bounds?: 'viewport' | Element | { left: number; right: number; top: number; bottom: number } | ((input: { target: HTMLElement; geometry: unknown }) => Element | { left: number; right: number; top: number; bottom: number });
  grid?: number | { x?: number; y?: number };
  activationDistance?: number;
  overscrollResistance?: number;
  magneticDistance?: number;
  dropZones?: HTMLElement | Iterable<HTMLElement> | string | (() => HTMLElement | Iterable<HTMLElement>);
  canDrop?(context: DragEventContext): boolean | Promise<boolean>;
  onDrop?(context: DragEventContext): void | Promise<void>;
  onReject?(context: DragEventContext): void;
  onLift?(context: DragEventContext): void;
  onMove?(context: DragEventContext): void;
  onCancel?(context: DragEventContext): void;
  onDragStateChange?(state: DragState, session: DragSession): void;
  announce?(event: DragEventContext & { type: string; messageKey: string; key?: string }): void;
  strategy?: 'original' | 'ghost' | 'layer';
  sourceVisibility?: 'visible' | 'hidden';
  zIndex?: number;
  cursor?: string;
  touchAction?: string;
  follow?: 'spring' | 'direct';
  spring?: { stiffness?: number; damping?: number; mass?: number };
  settleDuration?: number;
  autoScroll?: { edge?: number; speed?: number };
  keyboard?: boolean;
  keyboardStep?: number;
  restoreFocus?: boolean;
  respectReducedMotion?: boolean;
  reducedMotion?: boolean;
  seed?: string | number;
  context?: unknown;
  root?: Document | Element;
  view?: Window;
  motion?: Partial<Record<'lift' | 'drop' | 'reject' | 'cancel', TurbNode | ((context: DragEventContext) => TurbNode)>>;
}

export interface DragDiagnostics extends InteractionDiagnostics {
  readonly dragState: DragState;
  readonly activeTarget: number;
  readonly activePointerId: number;
  readonly keyboard: number;
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly zoneCount: number;
  readonly validationToken: number;
  readonly lastOutcome: string;
}

export interface DragSession {
  readonly state: DragState;
  readonly sessionState: InteractionState;
  readonly signal: AbortSignal;
  readonly diagnostics: DragDiagnostics;
  suspend(): InteractionSession;
  resume(): InteractionSession;
  cancel(reason?: string): DragSession;
  destroy(): DragSession;
}

export class InteractionError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export function createInteractionSession(options?: InteractionSessionOptions): InteractionSession;
export function hover(targets: HTMLElement | Iterable<HTMLElement> | string | (() => HTMLElement | Iterable<HTMLElement>), options: HoverOptions): InteractionSession;
export function drag(targets: HTMLElement | Iterable<HTMLElement> | string | (() => HTMLElement | Iterable<HTMLElement>), options?: DragOptions): DragSession;
export const interact: { hover: typeof hover; drag: typeof drag };
export default interact;
