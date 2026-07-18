import { surfaceError, surfaceErrorCodes } from '../errors';

export function createDOMBlocksRenderer({ canvas, source, mode = 'out', options = {} }) {
  const maximum = source.policy.applied.domBlocks || source.policy.policy.maxDomBlocks;
  const requested = Math.min(source.width * source.height, Number(options.domBlocks || maximum));
  const count = Math.max(1, Math.min(maximum, requested));
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * (source.width / source.height))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const container = canvas.ownerDocument.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.dataset.turbulencejsSurfaceBlocks = '';
  Object.assign(container.style, {
    ...Object.fromEntries(['position', 'pointerEvents', 'left', 'top', 'width', 'height', 'zIndex', 'overflow']
      .map(property => [property, canvas.style[property]])),
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`
  });
  const fragment = canvas.ownerDocument.createDocumentFragment();
  const blocks = [];
  for (let index = 0; index < count; index += 1) {
    const block = canvas.ownerDocument.createElement('i');
    const x = Math.min(source.width - 1, Math.floor((index % columns) / columns * source.width));
    const y = Math.min(source.height - 1, Math.floor(Math.floor(index / columns) / rows * source.height));
    const offset = (y * source.width + x) * 4;
    Object.assign(block.style, {
      display: 'block',
      backgroundColor: `rgba(${source.pixels[offset]}, ${source.pixels[offset + 1]}, ${source.pixels[offset + 2]}, ${source.pixels[offset + 3] / 255})`,
      willChange: 'opacity, transform'
    });
    blocks.push(block);
    fragment.append(block);
  }
  container.append(fragment);
  canvas.before(container);
  canvas.style.display = 'none';
  let disposed = false;
  return Object.freeze({
    type: 'dom-blocks',
    resources: Object.freeze({ domBlocks: count }),
    render(progress) {
      if (disposed) return;
      const reveal = mode === 'in' ? progress : 1 - progress;
      for (let index = 0; index < blocks.length; index += 1) {
        const visible = reveal >= 1 || (reveal > 0 && index / blocks.length < reveal);
        blocks[index].style.opacity = visible ? '1' : '0';
        blocks[index].style.transform = visible ? 'scale(1)' : 'scale(0.35)';
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      container.remove();
      canvas.style.removeProperty('display');
      blocks.length = 0;
    }
  });
}

export function assertDOMBlocksAvailable(canvas) {
  if (!canvas?.ownerDocument) throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'DOM block renderer requires a document.');
}
