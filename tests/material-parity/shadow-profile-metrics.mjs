function luminance(pixel) {
  return pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722;
}

function pixelAt(image, x, y) {
  const clampedX = Math.max(0, Math.min(image.width - 1, x));
  const clampedY = Math.max(0, Math.min(image.height - 1, y));
  const index = (clampedY * image.width + clampedX) * 4;
  return image.data.subarray(index, index + 4);
}

export function measureBottomShadowProfile(image, borderBox, deviceScaleFactor, rows = 5) {
  if (!borderBox) return undefined;
  const x = Math.round((borderBox.left + borderBox.width / 2) * deviceScaleFactor);
  const edge = Math.round(borderBox.bottom * deviceScaleFactor);
  const background = luminance(pixelAt(image, x, edge + (rows + 3) * deviceScaleFactor));
  let contactEdge = edge;
  let strongestContact = -Infinity;
  for (let candidate = edge - deviceScaleFactor; candidate <= edge + deviceScaleFactor; candidate += 1) {
    const strength = background - luminance(pixelAt(image, x, candidate));
    if (strength > strongestContact) {
      strongestContact = strength;
      contactEdge = candidate;
    }
  }
  return Array.from({ length: rows }, (_, offset) => {
    const value = luminance(pixelAt(image, x, contactEdge + offset * deviceScaleFactor));
    return Math.max(0, background - value);
  });
}

export function compareBottomShadowProfiles(referenceImage, candidateImage, referenceBox, candidateBox,
  deviceScaleFactor, maximumRowError = 18) {
  const reference = measureBottomShadowProfile(referenceImage, referenceBox, deviceScaleFactor);
  const candidate = measureBottomShadowProfile(candidateImage, candidateBox, deviceScaleFactor);
  if (!reference || !candidate) return { matches: false, reference, candidate, maximumRowError: Infinity };
  const rowErrors = reference.map((value, index) => Math.abs(value - candidate[index]));
  const maximumError = Math.max(...rowErrors);
  return { matches: maximumError <= maximumRowError, reference, candidate, rowErrors, maximumError };
}
