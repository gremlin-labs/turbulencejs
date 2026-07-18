import { resolveInteractionTargets } from './targets';

export function snapshotDropZones(source, options = {}) {
  if (!source) return [];
  return resolveInteractionTargets(source, options).filter(zone => zone.isConnected).map(zone => {
    const rect = zone.getBoundingClientRect();
    return Object.freeze({ zone, rect: Object.freeze({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }) });
  });
}

export function dropZoneAt(zones, point, magneticDistance = 0) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const entry of zones) {
    const inside = point.x >= entry.rect.left && point.x <= entry.rect.right && point.y >= entry.rect.top && point.y <= entry.rect.bottom;
    const centerX = entry.rect.left + entry.rect.width / 2;
    const centerY = entry.rect.top + entry.rect.height / 2;
    const distance = Math.hypot(point.x - centerX, point.y - centerY);
    if (inside) return { ...entry, magnetic: false };
    if (distance <= magneticDistance && distance < nearestDistance) { nearest = entry; nearestDistance = distance; }
  }
  return nearest ? { ...nearest, magnetic: true } : null;
}
