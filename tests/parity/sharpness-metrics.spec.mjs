import assert from 'node:assert/strict';
import test from 'node:test';
import { compareSharpness, cropRgba, evaluateSharpness } from './sharpness-metrics.mjs';

function image(width, height, painter) {
  const data = new Uint8Array(width * height * 4).fill(255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = painter(x, y);
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

function blur(source) {
  return image(source.width, source.height, (x, y) => {
    let total = 0;
    let count = 0;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const sx = Math.max(0, Math.min(source.width - 1, x + dx));
      const sy = Math.max(0, Math.min(source.height - 1, y + dy));
      total += source.data[(sy * source.width + sx) * 4];
      count += 1;
    }
    return Math.round(total / count);
  });
}

const text = image(96, 36, (x, y) => (
  (x > 8 && x < 14 && y > 7 && y < 29) ||
  (x > 20 && x < 41 && (y > 7 && y < 12 || y > 17 && y < 22 || y > 25 && y < 30)) ||
  (x > 49 && x < 55 && y > 7 && y < 29) ? 20 : 245
));

test('identical focused crops pass', () => {
  assert.equal(evaluateSharpness(compareSharpness(text, text)).meetsTarget, true);
});

test('deliberately blurred text fails', () => {
  assert.equal(evaluateSharpness(compareSharpness(text, blur(text))).meetsTarget, false);
});

test('softened and displaced one-pixel border fails', () => {
  const border = image(80, 40, (_x, y) => y === 12 ? 15 : 245);
  const degraded = image(80, 40, (_x, y) => y >= 14 && y <= 16 ? 150 : 245);
  assert.equal(evaluateSharpness(compareSharpness(border, degraded)).meetsTarget, false);
});

test('flat background outside an identified crop cannot dominate', () => {
  const largeReference = image(400, 240, (x, y) => x >= 150 && x < 246 && y >= 90 && y < 126
    ? text.data[((y - 90) * text.width + (x - 150)) * 4]
    : 245);
  const blurred = blur(text);
  const largeCandidate = image(400, 240, (x, y) => x >= 150 && x < 246 && y >= 90 && y < 126
    ? blurred.data[((y - 90) * blurred.width + (x - 150)) * 4]
    : 245);
  const bounds = { left: 150, top: 90, right: 246, bottom: 126 };
  assert.equal(evaluateSharpness(compareSharpness(
    cropRgba(largeReference, bounds),
    cropRgba(largeCandidate, bounds),
  )).meetsTarget, false);
});
