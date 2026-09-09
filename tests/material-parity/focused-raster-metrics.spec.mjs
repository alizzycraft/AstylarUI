import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';

function image(width, height, painter) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const color = painter(x, y);
    data.set([...color, 255], (y * width + x) * 4);
  }
  return { width, height, data };
}

function tooltip({ shiftX = 0, shiftY = 0, background = [50, 48, 51] } = {}) {
  return image(120, 36, (x, y) => {
    const localX = x - shiftX;
    const localY = y - shiftY;
    const inside = localX >= 6 && localX < 114 && localY >= 6 && localY < 30;
    const glyph = inside && (
      (localX >= 24 && localX <= 27 && localY >= 12 && localY <= 24) ||
      (localX >= 34 && localX <= 50 && (localY >= 12 && localY <= 14 || localY >= 18 && localY <= 20 || localY >= 23 && localY <= 25)) ||
      (localX >= 58 && localX <= 61 && localY >= 12 && localY <= 24) ||
      (localX >= 68 && localX <= 84 && (localY >= 12 && localY <= 14 || localY >= 23 && localY <= 25))
    );
    if (glyph) return [247, 241, 246];
    return inside ? background : [255, 251, 254];
  });
}

function blur(source) {
  return image(source.width, source.height, (x, y) => {
    const color = [0, 0, 0];
    let samples = 0;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const sx = Math.max(0, Math.min(source.width - 1, x + dx));
      const sy = Math.max(0, Math.min(source.height - 1, y + dy));
      const offset = (sy * source.width + sx) * 4;
      for (let channel = 0; channel < 3; channel += 1) color[channel] += source.data[offset + channel];
      samples += 1;
    }
    return color.map((value) => Math.round(value / samples));
  });
}

const target = { minimumSsim: .90 };

test('identical focused rasters pass without phase registration', () => {
  const reference = tooltip();
  const result = evaluateFocusedRaster(reference, reference, target);

  assert.equal(result.matches, true);
  assert.deepEqual(result.phaseOffset, { x: 0, y: 0 });
});

test('a crisp one-physical-pixel raster phase passes', () => {
  const result = evaluateFocusedRaster(tooltip(), tooltip({ shiftX: 1, shiftY: -1 }), target);

  assert.equal(result.matches, true);
  assert.deepEqual(result.phaseOffset, { x: -1, y: 1 });
  assert.ok(result.similarity >= target.minimumSsim);
});

test('a real four-pixel displacement still fails', () => {
  assert.equal(evaluateFocusedRaster(tooltip(), tooltip({ shiftX: 4 }), target).matches, false);
});

test('blurred glyphs fail after phase registration', () => {
  assert.equal(evaluateFocusedRaster(tooltip(), blur(tooltip({ shiftX: 1 })), target).matches, false);
});

test('obviously wrong surface paint fails after phase registration', () => {
  assert.equal(evaluateFocusedRaster(
    tooltip(),
    tooltip({ shiftX: 1, background: [255, 255, 255] }),
    target,
  ).matches, false);
});
