import { turb } from 'turbulencejs';
import { surfaceDiagnostics } from './diagnostics';
import { createSurfaceLayer } from './layer';
import { createSurfacePolicy, defaultSurfacePolicy, applySurfacePolicy } from './policy';
import { createSurfaceRenderer, renderers } from './renderers';
import { source, resolveSurfaceSource } from './source';
import { captureElement } from './providers/element';

export { SurfaceError, surfaceErrorCodes } from './errors';
export { source, isSurfaceSource, resolveSurfaceSource } from './source';
export { createSurfacePolicy, defaultSurfacePolicy, applySurfacePolicy } from './policy';
export { createCanvas2DRenderer } from './renderers/canvas2d';
export { createDOMBlocksRenderer } from './renderers/dom-blocks';
export { createWebGL2Renderer } from './renderers/webgl2';
export { createWorkerRenderer } from './renderers/worker';
export { createSurfaceRenderer, renderers } from './renderers';
export { captureElement } from './providers/element';

export function program(sourceInput, rendererFactory = createSurfaceRenderer, options = {}) {
  if (typeof rendererFactory !== 'function') throw new TypeError('surface.program requires a renderer factory.');
  const duration = options.duration ?? 600;
  return turb.driver(context => {
    const mode = options.mode === 'in' ? 'in' : 'out';
    if (context.reducedMotion) {
      return {
        ownedProperties: ['visibility'],
        render(progress) {
          if (progress === 1 && options.visibility !== 'preserve') {
            context.target.style.visibility = mode === 'out' ? 'hidden' : 'visible';
          }
        },
        diagnostics: { renderer: 'reduced', reduced: 1 }
      };
    }
    const resolved = resolveSurfaceSource(
      typeof sourceInput === 'function' ? () => sourceInput(context) : sourceInput,
      { ...options, signal: context.lifecycle.signal }
    );
    const layer = createSurfaceLayer(context.target, {
      ...options,
      width: resolved.width,
      height: resolved.height
    });
    context.lifecycle.cleanup(layer.dispose);
    const renderer = rendererFactory({ canvas: layer.canvas, source: resolved, seed: options.seed, mode, context, options });
    if (!renderer || typeof renderer.render !== 'function' || typeof renderer.dispose !== 'function') {
      throw new TypeError('Surface renderer factory must return render() and dispose() functions.');
    }
    context.lifecycle.cleanup(renderer.dispose);
    Object.entries(renderer.resources || {}).forEach(([type, count]) => context.lifecycle.resource(type, count));
    return {
      ownedProperties: ['visibility'],
      render(progress, frame) { renderer.render(progress, frame); },
      finish() {
        if (options.visibility !== 'preserve') context.target.style.visibility = mode === 'out' ? 'hidden' : 'visible';
      },
      diagnostics: surfaceDiagnostics(resolved, renderer),
      resources: renderer.resources
    };
  }, {
    duration,
    easing: options.easing || 'linear',
    reversible: options.reversible !== false,
    seekable: options.seekable !== false,
    pausable: true,
    finishable: true
  });
}

export const dissolve = Object.freeze({
  in: (sourceInput, options = {}) => program(sourceInput, createSurfaceRenderer, { ...options, mode: 'in' }),
  out: (sourceInput, options = {}) => program(sourceInput, createSurfaceRenderer, { ...options, mode: 'out' })
});

export const surface = Object.freeze({
  source,
  program,
  dissolve,
  capture: Object.freeze({ element: captureElement }),
  policy: Object.freeze({ create: createSurfacePolicy, apply: applySurfacePolicy, defaults: defaultSurfacePolicy }),
  renderers
});

export default surface;
