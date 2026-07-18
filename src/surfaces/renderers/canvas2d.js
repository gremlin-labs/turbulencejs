import { surfaceError, surfaceErrorCodes } from '../errors';

function hash(index, seed) {
  let value = (index + 1) ^ seed;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function seedNumber(seed) {
  const text = String(seed ?? 'turbulencejs');
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) result = Math.imul(result ^ text.charCodeAt(index), 16777619);
  return result >>> 0;
}

export function createCanvas2DRenderer({ canvas, source, seed, mode = 'out' }) {
  const context = canvas.getContext('2d');
  if (!context) throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'Canvas2D renderer context is unavailable.');
  const output = context.createImageData(source.width, source.height);
  const thresholds = new Float32Array(source.width * source.height);
  const numericSeed = seedNumber(seed);
  for (let index = 0; index < thresholds.length; index += 1) thresholds[index] = hash(index, numericSeed);
  let disposed = false;
  return Object.freeze({
    type: 'canvas2d',
    resources: Object.freeze({ canvases: 1, pixels: thresholds.length, allocationBytes: output.data.byteLength + thresholds.byteLength }),
    render(progress) {
      if (disposed) return;
      const reveal = mode === 'in' ? progress : 1 - progress;
      for (let index = 0; index < thresholds.length; index += 1) {
        const offset = index * 4;
        output.data[offset] = source.pixels[offset];
        output.data[offset + 1] = source.pixels[offset + 1];
        output.data[offset + 2] = source.pixels[offset + 2];
        output.data[offset + 3] = reveal >= 1 || (reveal > 0 && thresholds[index] < reveal) ? source.pixels[offset + 3] : 0;
      }
      context.putImageData(output, 0, 0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}
