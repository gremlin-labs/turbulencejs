export class InteractionError extends Error {
  constructor(code, message, details = {}, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'InteractionError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export const interactionErrorCodes = Object.freeze({
  INVALID_TARGET: 'INTERACTION_INVALID_TARGET',
  INVALID_STATE: 'INTERACTION_INVALID_STATE',
  DESTROYED: 'INTERACTION_DESTROYED',
  FACTORY_FAILED: 'INTERACTION_FACTORY_FAILED'
});
