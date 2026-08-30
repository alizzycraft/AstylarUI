import { TransformData } from '../../../types/transform-data';

export interface RenderTransformOffset {
  x: number;
  y: number;
  z: number;
}

/** Parse the supported two-dimensional CSS transform functions into CSS-space values. */
export function parseCssTransform(transform: string | undefined): TransformData | null {
  if (!transform || transform.trim().toLowerCase() === 'none') return null;

  const result: TransformData = {
    translate: { x: 0, y: 0, z: 0 },
    rotate: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  let matched = false;

  for (const match of transform.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)) {
    const name = match[1].toLowerCase();
    const values = match[2].trim().split(/(?:\s*,\s*|\s+)/).filter(Boolean);
    switch (name) {
      case 'translate':
        if (values[0] !== undefined) {
          result.translate.x = parseFloat(values[0]) || 0;
          result.translate.y = values[1] === undefined ? 0 : parseFloat(values[1]) || 0;
          matched = true;
        }
        break;
      case 'translatex':
        result.translate.x = parseFloat(values[0]) || 0;
        matched = true;
        break;
      case 'translatey':
        result.translate.y = parseFloat(values[0]) || 0;
        matched = true;
        break;
      case 'rotate':
        result.rotate.z = parseAngle(match[2]);
        matched = true;
        break;
      case 'scale': {
        const x = parseFloat(values[0]);
        if (Number.isFinite(x)) {
          const y = values[1] === undefined ? x : parseFloat(values[1]);
          result.scale.x = x;
          result.scale.y = Number.isFinite(y) ? y : x;
          result.scale.z = 1;
          matched = true;
        }
        break;
      }
      case 'scalex':
        result.scale.x = parseFloat(values[0]) || 0;
        matched = true;
        break;
      case 'scaley':
        result.scale.y = parseFloat(values[0]) || 0;
        matched = true;
        break;
    }
  }

  return matched ? result : null;
}

/**
 * Convert CSS translation (positive right/down) into Astylar render space.
 * Render X is mirrored and render Y is up-positive, so CSS right/down both
 * map to negative render offsets. CSS pixels are scaled exactly once,
 * irrespective of the canvas DPR.
 */
export function cssTranslationToRenderOffset(
  transform: TransformData,
  pixelToWorldScale: number,
): RenderTransformOffset {
  return {
    x: -transform.translate.x * pixelToWorldScale,
    y: -transform.translate.y * pixelToWorldScale,
    z: transform.translate.z * pixelToWorldScale,
  };
}

function parseAngle(value: string): number {
  const amount = parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('rad')) return amount;
  if (normalized.endsWith('turn')) return amount * Math.PI * 2;
  if (normalized.endsWith('grad')) return amount * Math.PI / 200;
  return amount * Math.PI / 180;
}
