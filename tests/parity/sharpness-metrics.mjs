function luminance(data, index) {
  return (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
}

export function cropRgba(image, bounds) {
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(image.width, Math.ceil(bounds.right));
  const bottom = Math.min(image.height, Math.ceil(bounds.bottom));
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((top + y) * image.width + left) * 4;
    data.set(image.data.subarray(sourceStart, sourceStart + width * 4), y * width * 4);
  }
  return { width, height, data, bounds: { left, top, right, bottom, width, height } };
}

export function gradientMagnitudes(image) {
  const values = [];
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const center = (y * image.width + x) * 4;
      const left = center - 4;
      const right = center + 4;
      const up = center - image.width * 4;
      const down = center + image.width * 4;
      const gx = luminance(image.data, right) - luminance(image.data, left);
      const gy = luminance(image.data, down) - luminance(image.data, up);
      values.push(Math.hypot(gx, gy) / 2);
    }
  }
  return values;
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

export function sharpnessProfile(image) {
  const gradients = gradientMagnitudes(image).sort((a, b) => a - b);
  const threshold = percentile(gradients, 0.9);
  const focused = gradients.filter((value) => value >= threshold && value > 0.005);
  const gradientEnergy = focused.length
    ? Math.sqrt(focused.reduce((sum, value) => sum + value * value, 0) / focused.length)
    : 0;
  return {
    gradientEnergy,
    p90Gradient: threshold,
    p95Gradient: percentile(gradients, 0.95),
    edgePixelCount: focused.length,
    samplePixelCount: gradients.length,
  };
}

export function compareSharpness(reference, candidate) {
  if (reference.width !== candidate.width || reference.height !== candidate.height) {
    throw new Error('Sharpness crops must have identical dimensions.');
  }
  const referenceProfile = sharpnessProfile(reference);
  const candidateProfile = sharpnessProfile(candidate);
  const referenceGradients = gradientMagnitudes(reference);
  const candidateGradients = gradientMagnitudes(candidate);
  const gradientWidth = Math.max(0, reference.width - 2);
  const gradientHeight = Math.max(0, reference.height - 2);
  let aligned = 0;
  let referenceWeight = 0;
  let squaredError = 0;
  for (let index = 0; index < referenceGradients.length; index += 1) {
    const expected = referenceGradients[index];
    const actual = candidateGradients[index];
    const x = index % gradientWidth;
    const y = Math.floor(index / gradientWidth);
    let localActual = actual;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const localX = x + dx;
      const localY = y + dy;
      if (localX < 0 || localX >= gradientWidth || localY < 0 || localY >= gradientHeight) continue;
      localActual = Math.max(localActual, candidateGradients[localY * gradientWidth + localX]);
    }
    referenceWeight += expected;
    aligned += Math.min(expected, localActual);
    const delta = expected - actual;
    squaredError += delta * delta;
  }
  return {
    reference: referenceProfile,
    candidate: candidateProfile,
    gradientEnergyRetention: referenceProfile.gradientEnergy > 0
      ? candidateProfile.gradientEnergy / referenceProfile.gradientEnergy
      : candidateProfile.gradientEnergy === 0 ? 1 : 0,
    edgeAlignment: referenceWeight > 0 ? aligned / referenceWeight : 1,
    gradientRmse: Math.sqrt(squaredError / Math.max(1, referenceGradients.length)),
  };
}

export function evaluateSharpness(comparison, target = {}) {
  const minimumGradientEnergyRetention = target.minimumGradientEnergyRetention ?? 0.82;
  const minimumEdgeAlignment = target.minimumEdgeAlignment ?? 0.82;
  const maximumGradientRmse = target.maximumGradientRmse ?? 0.12;
  return {
    ...comparison,
    target: { minimumGradientEnergyRetention, minimumEdgeAlignment, maximumGradientRmse },
    meetsTarget: comparison.gradientEnergyRetention >= minimumGradientEnergyRetention &&
      comparison.edgeAlignment >= minimumEdgeAlignment &&
      comparison.gradientRmse <= maximumGradientRmse,
  };
}
