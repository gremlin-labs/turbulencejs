import { surfaceError, surfaceErrorCodes } from '../errors';
import { applyAssetPolicy } from './assets';

const unsupportedSelector = 'video, iframe, object, embed';

function copyControlState(original, clone) {
  const originals = [original, ...original.querySelectorAll('input, textarea, select, canvas')];
  const clones = [clone, ...clone.querySelectorAll('input, textarea, select, canvas')];
  originals.forEach((node, index) => {
    const target = clones[index];
    if (node instanceof HTMLInputElement) {
      target.setAttribute('value', node.value);
      if (node.checked) target.setAttribute('checked', ''); else target.removeAttribute('checked');
    } else if (node instanceof HTMLTextAreaElement) target.textContent = node.value;
    else if (node instanceof HTMLSelectElement) {
      [...target.options].forEach((option, optionIndex) => { option.selected = node.options[optionIndex]?.selected === true; });
    } else if (node instanceof HTMLCanvasElement) {
      try {
        const image = node.ownerDocument.createElement('img');
        image.src = node.toDataURL();
        target.replaceWith(image);
      } catch (error) {
        throw surfaceError(surfaceErrorCodes.TAINTED, 'A captured canvas is not origin-clean.', { category: 'canvas' }, error);
      }
    }
  });
}

function copyStyles(original, clone, diagnostics) {
  const originals = [original, ...original.querySelectorAll('*')];
  const clones = [clone, ...clone.querySelectorAll('*')];
  originals.forEach((node, index) => {
    const style = original.ownerDocument.defaultView.getComputedStyle(node);
    let css = '';
    for (let propertyIndex = 0; propertyIndex < style.length; propertyIndex += 1) {
      const property = style[propertyIndex];
      let value = style.getPropertyValue(property);
      if (value.includes('url(')) {
        value = 'none';
        diagnostics.skippedAssets += 1;
      }
      css += `${property}:${value};`;
    }
    clones[index].setAttribute('style', css);
  });
}

export function cloneElementForCapture(element, options = {}) {
  if (!element?.isConnected) throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'Captured element must be connected.', { category: 'disconnected' });
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) throw surfaceError(surfaceErrorCodes.ZERO_AREA, 'Captured element has zero area.');
  const unsupported = [element, ...element.querySelectorAll(unsupportedSelector)];
  if (unsupported.some(node => node.matches?.(unsupportedSelector)) && options.unsupported !== 'omit') {
    throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'Element capture contains unsupported replaced or protected content.', {
      category: 'video-iframe-object'
    });
  }
  const clone = element.cloneNode(true);
  const diagnostics = { skippedAssets: 0, inlinedAssets: 0, failedAssets: 0, omittedUnsupported: 0, pseudoElements: 'omitted', fonts: 'document-ready' };
  copyControlState(element, clone);
  copyStyles(element, clone, diagnostics);
  const assets = applyAssetPolicy(element, clone, options, diagnostics);
  if (options.unsupported === 'omit') {
    clone.querySelectorAll(unsupportedSelector).forEach(node => { node.remove(); diagnostics.omittedUnsupported += 1; });
    if (clone.matches?.(unsupportedSelector)) throw surfaceError(surfaceErrorCodes.UNSUPPORTED_INPUT, 'The capture root itself cannot be omitted.');
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  return Object.freeze({ clone, rect, diagnostics, assets: Object.freeze(assets) });
}
