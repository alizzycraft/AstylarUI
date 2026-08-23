import { ssim } from 'ssim.js';
import { compareSharpness, evaluateSharpness } from '../parity/sharpness-metrics.mjs';

export function meanAbsoluteColorError(reference, candidate) {
  assertSameDimensions(reference, candidate);
  let difference = 0;
  for (let index = 0; index < reference.data.length; index += 4) {
    difference += Math.abs(reference.data[index] - candidate.data[index]);
    difference += Math.abs(reference.data[index + 1] - candidate.data[index + 1]);
    difference += Math.abs(reference.data[index + 2] - candidate.data[index + 2]);
  }
  return difference / Math.max(1, reference.width * reference.height * 3 * 255);
}

export function colorEdgeAlignment(reference, candidate, tolerance = 1) {
  assertSameDimensions(reference, candidate);
  const referenceEdges = colorEdges(reference);
  const candidateEdges = colorEdges(candidate);
  const width = Math.max(0, reference.width - 2);
  const height = Math.max(0, reference.height - 2);
  const directed = (expected, actual) => {
    let aligned = 0;
    let weight = 0;
    for (let index = 0; index < expected.length; index += 1) {
      const edge = expected[index];
      if (edge <= 0.01) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      let nearby = 0;
      for (let dy = -tolerance; dy <= tolerance; dy += 1) {
        for (let dx = -tolerance; dx <= tolerance; dx += 1) {
          const localX = x + dx;
          const localY = y + dy;
          if (localX < 0 || localX >= width || localY < 0 || localY >= height) continue;
          nearby = Math.max(nearby, actual[localY * width + localX]);
        }
      }
      weight += edge;
      aligned += Math.min(edge, nearby);
    }
    return weight > 0 ? aligned / weight : 1;
  };
  return Math.min(directed(referenceEdges, candidateEdges), directed(candidateEdges, referenceEdges));
}

export function evaluateInteractionRaster(reference, candidate, target = {}) {
  assertSameDimensions(reference, candidate);
  const similarity = ssim(reference, candidate).mssim;
  const sharpness = evaluateSharpness(compareSharpness(reference, candidate), {
    ...target,
    minimumGradientEnergyRetention: target.minimumInteractionGradientEnergyRetention ??
      target.minimumGradientEnergyRetention,
    minimumEdgeAlignment: target.minimumInteractionEdgeAlignment ?? target.minimumEdgeAlignment,
  });
  const colorError = meanAbsoluteColorError(reference, candidate);
  const edgeAlignment = colorEdgeAlignment(reference, candidate);
  const minimumInteractionLocalSsim = target.minimumInteractionLocalSsim ?? 0.74;
  const maximumInteractionColorError = target.maximumInteractionColorError ?? 0.08;
  const minimumInteractionColorEdgeAlignment = target.minimumInteractionColorEdgeAlignment ?? 0.65;
  return {
    similarity,
    sharpness,
    colorError,
    edgeAlignment,
    target: { minimumInteractionLocalSsim, maximumInteractionColorError, minimumInteractionColorEdgeAlignment },
    meetsTarget: similarity >= minimumInteractionLocalSsim &&
      colorError <= maximumInteractionColorError &&
      edgeAlignment >= minimumInteractionColorEdgeAlignment && sharpness.meetsTarget,
  };
}

export function hasRasterColor(image, box, hexColor, canvas) {
  const match = /^#([0-9a-f]{6})$/i.exec(hexColor ?? '');
  if (!box || !match || !canvas?.width || !canvas?.height) return false;
  const value = Number.parseInt(match[1], 16);
  const expected = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const scaleX = image.width / canvas.width;
  const scaleY = image.height / canvas.height;
  const left = Math.max(0, Math.floor(box.left * scaleX));
  const right = Math.min(image.width, Math.ceil(box.right * scaleX));
  const top = Math.max(0, Math.floor(box.top * scaleY));
  const bottom = Math.min(image.height, Math.ceil(box.bottom * scaleY));
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const index = (y * image.width + x) * 4;
    const difference = Math.abs(image.data[index] - expected[0]) +
      Math.abs(image.data[index + 1] - expected[1]) +
      Math.abs(image.data[index + 2] - expected[2]);
    if (difference <= 36) return true;
  }
  return false;
}

function colorEdges(image) {
  const edges = [];
  for (let y = 1; y < image.height - 1; y += 1) for (let x = 1; x < image.width - 1; x += 1) {
    const center = (y * image.width + x) * 4;
    const left = center - 4;
    const right = center + 4;
    const up = center - image.width * 4;
    const down = center + image.width * 4;
    let squared = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const gx = (image.data[right + channel] - image.data[left + channel]) / 255;
      const gy = (image.data[down + channel] - image.data[up + channel]) / 255;
      squared += gx * gx + gy * gy;
    }
    edges.push(Math.sqrt(squared) / Math.sqrt(6));
  }
  return edges;
}

function assertSameDimensions(reference, candidate) {
  if (reference.width !== candidate.width || reference.height !== candidate.height) {
    throw new Error('Interaction crops must have identical dimensions.');
  }
}
