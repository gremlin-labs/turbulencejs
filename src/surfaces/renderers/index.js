import { createCanvas2DRenderer } from './canvas2d';
import { createDOMBlocksRenderer } from './dom-blocks';
import { createWebGL2Renderer } from './webgl2';
import { createWorkerRenderer } from './worker';
import { surfaceError, surfaceErrorCodes } from '../errors';

const factories = Object.freeze({
  canvas2d: createCanvas2DRenderer,
  'dom-blocks': createDOMBlocksRenderer,
  webgl2: createWebGL2Renderer,
  worker: createWorkerRenderer
});

function autoOrder(input) {
  const pixelCount = input.source.width * input.source.height;
  if (pixelCount >= 250000 && input.options?.workerFactory && typeof input.canvas.transferControlToOffscreen === 'function') {
    return ['worker', 'webgl2', 'canvas2d'];
  }
  if (pixelCount >= 50000) return ['webgl2', 'canvas2d'];
  return ['canvas2d'];
}

export function createSurfaceRenderer(input) {
  const requested = input.options?.renderer || 'auto';
  const strict = input.options?.strictRenderer === true;
  const order = requested === 'auto'
    ? autoOrder(input)
    : [requested, ...(strict || requested === 'canvas2d' ? [] : ['canvas2d'])];
  const attempts = [];
  for (const name of order) {
    const factory = factories[name];
    if (!factory) {
      attempts.push(Object.freeze({ renderer: name, reason: 'unknown-renderer' }));
      continue;
    }
    try {
      let renderer = factory(input);
      let replacement = null;
      const chain = [...attempts, Object.freeze({ renderer: name, reason: 'selected' })];
      return Object.freeze({
        get type() { return renderer.type; },
        get resources() { return renderer.resources; },
        render(progress, context) {
          try { renderer.render(progress, context); }
          catch (error) {
            if (strict || renderer.type === 'canvas2d') throw error;
            renderer.dispose();
            const original = input.canvas;
            replacement = original.cloneNode(false);
            replacement.width = original.width;
            replacement.height = original.height;
            original.replaceWith(replacement);
            renderer = createCanvas2DRenderer({ ...input, canvas: replacement });
            chain.push(Object.freeze({ renderer: 'canvas2d', reason: `runtime-fallback:${error.code || error.name || 'render-error'}` }));
            renderer.render(progress, context);
          }
        },
        dispose() {
          renderer.dispose();
          replacement?.remove();
        },
        requestedRenderer: requested,
        get fallbackChain() { return Object.freeze([...chain]); }
      });
    } catch (error) {
      attempts.push(Object.freeze({ renderer: name, reason: error.code || error.name || 'setup-failed' }));
    }
  }
  const final = attempts.at(-1);
  throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, `No surface renderer could be created; last attempt ${final?.renderer || 'unknown'} failed (${final?.reason || 'unknown'}).`, { attempts });
}

export const renderers = Object.freeze({ ...factories, auto: createSurfaceRenderer });
