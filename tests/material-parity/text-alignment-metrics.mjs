export function measureTextInkCenter(image, box, scale) {
  const left = Math.max(0, Math.floor((box.left + box.width * .12) * scale));
  const right = Math.min(image.width, Math.ceil((box.right - box.width * .12) * scale));
  const top = Math.max(0, Math.floor((box.top + box.height * .15) * scale));
  const bottom = Math.min(image.height, Math.ceil((box.bottom - box.height * .15) * scale));
  if (left >= right || top >= bottom) return undefined;
  const histogram = new Map();
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * image.width + x) * 4;
      const key = `${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`;
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
    }
  }
  const dominant = [...histogram.entries()].sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])[0]?.[0]
    ?.split(',').map(Number);
  if (!dominant) return undefined;
  let weightedY = 0;
  let totalWeight = 0;
  let pixels = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * image.width + x) * 4;
      const distance = Math.hypot(
        image.data[offset] - dominant[0],
        image.data[offset + 1] - dominant[1],
        image.data[offset + 2] - dominant[2],
      );
      const weight = Math.max(0, distance - 18);
      if (!weight) continue;
      weightedY += ((y + .5) / scale) * weight;
      totalWeight += weight;
      pixels += 1;
    }
  }
  if (!totalWeight || pixels < 4) return undefined;
  const centerY = weightedY / totalWeight;
  return {
    centerY,
    offsetFromBoxCenterPx: centerY - (box.top + box.height / 2),
    inkPixels: pixels,
    dominantColor: dominant,
  };
}

export function textCenterOffsetError(reference, candidate) {
  if (!reference || !candidate) return Infinity;
  return Math.abs(reference.offsetFromBoxCenterPx - candidate.offsetFromBoxCenterPx);
}
