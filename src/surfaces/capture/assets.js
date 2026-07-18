import { surfaceError, surfaceErrorCodes } from '../errors';

function originOf(url, base) {
  try { return new URL(url, base).origin; } catch { return null; }
}

export function applyAssetPolicy(original, clone, options, diagnostics) {
  const policy = options.assets || 'none';
  if (!['none', 'same-origin', 'cors'].includes(policy)) {
    throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, 'Capture asset policy must be none, same-origin, or cors.');
  }
  const originals = [original, ...original.querySelectorAll('[src], [href]')];
  const clones = [clone, ...clone.querySelectorAll('[src], [href]')];
  const assets = [];
  originals.forEach((node, index) => {
    const attribute = node.hasAttribute?.('src') ? 'src' : node.hasAttribute?.('href') ? 'href' : null;
    if (!attribute) return;
    const target = clones[index];
    const value = node.getAttribute(attribute);
    const origin = originOf(value, original.baseURI);
    const sameOrigin = origin === original.ownerDocument.location?.origin;
    if (policy === 'none' || (policy === 'same-origin' && !sameOrigin)) {
      target.removeAttribute(attribute);
      diagnostics.skippedAssets += 1;
      return;
    }
    target.removeAttribute(attribute);
    assets.push(Object.freeze({ target, attribute, url: new URL(value, original.baseURI).href }));
  });
  return assets;
}

function blobAsDataURL(blob, signal) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    const finish = callback => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      callback();
    };
    const abort = () => finish(() => { reader.abort(); reject(surfaceError(surfaceErrorCodes.ABORTED, 'Capture asset loading was aborted.')); });
    reader.addEventListener('load', () => finish(() => resolve(reader.result)), { once: true });
    reader.addEventListener('error', () => finish(() => reject(surfaceError(surfaceErrorCodes.NOT_READY, 'Capture asset could not be decoded.'))), { once: true });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    reader.readAsDataURL(blob);
  });
}

export async function inlineCaptureAssets(assets, options, diagnostics) {
  if (assets.length === 0) return;
  if (typeof fetch !== 'function') throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'Explicit capture assets require fetch support.');
  const credentials = options.credentials || 'omit';
  if (!['omit', 'same-origin'].includes(credentials)) {
    throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, 'Capture credentials must be omit or same-origin.');
  }
  for (const asset of assets) {
    try {
      const response = await fetch(asset.url, {
        mode: options.assets === 'cors' ? 'cors' : 'same-origin',
        credentials,
        signal: options.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (blob.size > (options.maxAssetBytes || 8 * 1024 * 1024)) {
        throw surfaceError(surfaceErrorCodes.POLICY_REJECTED, 'Capture asset exceeds maxAssetBytes.', { size: blob.size });
      }
      asset.target.setAttribute(asset.attribute, await blobAsDataURL(blob, options.signal));
      diagnostics.inlinedAssets += 1;
    } catch (error) {
      diagnostics.failedAssets += 1;
      if (options.assetFailure === 'omit') continue;
      if (error?.code) throw error;
      throw surfaceError(surfaceErrorCodes.NOT_READY, 'A capture asset could not be loaded under the selected policy.', {
        category: 'asset'
      }, error);
    }
  }
}
