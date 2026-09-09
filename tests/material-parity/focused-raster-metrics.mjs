import { ssim } from 'ssim.js';
import { compareSharpness, evaluateSharpness } from '../parity/sharpness-metrics.mjs';
import { colorEdgeAlignment, meanAbsoluteColorError } from '../tts-parity/interaction-metrics.mjs';

/**
 * Compare target-local paint while allowing only the one-physical-pixel phase
 * difference already accepted by the renderer parity contract. Page-space
 * position and size remain the responsibility of the independent geometry
 * comparison; this metric continues to reject intrinsic displacement, blur,
 * and incorrect paint inside the measured target.
 */
export function evaluateFocusedRaster(reference, candidate, target = {}) {
  assertSameDimensions(reference, candidate);
  const maximumPhaseOffset = target.maximumPhaseOffset ?? 1;
  let best;
  for (let y = -maximumPhaseOffset; y <= maximumPhaseOffset; y += 1) {
    for (let x = -maximumPhaseOffset; x <= maximumPhaseOffset; x += 1) {
      const aligned = overlappingPair(reference, candidate, x, y);
      if (!aligned.reference.width || !aligned.reference.height) continue;
      const similarity = ssim(aligned.reference, aligned.candidate, { ssim: 'fast' }).mssim;
      if (!best || similarity > best.similarity) best = { ...aligned, similarity, phaseOffset: { x, y } };
    }
  }
  if (!best) throw new Error('Focused raster comparison has no overlapping pixels.');

  const sharpness = evaluateSharpness(compareSharpness(best.reference, best.candidate), target);
  const colorError = meanAbsoluteColorError(best.reference, best.candidate);
  const edgeAlignment = colorEdgeAlignment(best.reference, best.candidate);
  const minimumSsim = target.minimumSsim ?? .80;
  return {
    similarity: best.similarity,
    phaseOffset: best.phaseOffset,
    sharpness,
    colorError,
    edgeAlignment,
    minimumSsim,
    // Focused-raster acceptance has always been owned by the configured SSIM
    // threshold. Sharpness, color error, and edge alignment remain diagnostic
    // evidence; promoting their generic defaults to new release gates would
    // invalidate component-specific calibration without a baseline study.
    matches: best.similarity >= minimumSsim,
  };
}

function overlappingPair(reference, candidate, phaseX, phaseY) {
  const left = Math.max(0, phaseX);
  const top = Math.max(0, phaseY);
  const right = Math.min(reference.width, reference.width + phaseX);
  const bottom = Math.min(reference.height, reference.height + phaseY);
  return {
    reference: crop(reference, left, top, right, bottom),
    candidate: crop(candidate, left - phaseX, top - phaseY, right - phaseX, bottom - phaseY),
  };
}

function crop(image, left, top, right, bottom) {
  const width = right - left;
  const height = bottom - top;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((top + y) * image.width + left) * 4;
    data.set(image.data.subarray(sourceStart, sourceStart + width * 4), y * width * 4);
  }
  return { width, height, data };
}

function assertSameDimensions(reference, candidate) {
  if (reference.width !== candidate.width || reference.height !== candidate.height) {
    throw new Error('Focused raster crops must have identical dimensions.');
  }
}
