export function announceDrag(options, type, payload) {
  options.announce?.(Object.freeze({ type, messageKey: `drag.${type}`, ...payload }));
}
