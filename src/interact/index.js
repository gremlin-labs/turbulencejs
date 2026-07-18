import * as turbulencejs from 'turbulencejs';
import { createHover } from './hover';
import { createDrag } from './drag';

export { createInteractionSession } from './session';
export { InteractionError, interactionErrorCodes } from './errors';

export function hover(targets, options = {}) { return createHover(turbulencejs, targets, options); }
export function drag(targets, options = {}) { return createDrag(turbulencejs, targets, options); }

export const interact = Object.freeze({ hover, drag });
export default interact;
