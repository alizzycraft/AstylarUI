import assert from 'node:assert/strict';
import test from 'node:test';
import { PNG } from 'pngjs';
import { measureTextInkCenter, textCenterOffsetError } from './text-alignment-metrics.mjs';

const box = { left: 0, top: 0, right: 40, bottom: 20, width: 40, height: 20 };

test('detects a vertically shifted local text-ink region', () => {
  const reference = syntheticButton(1, 8);
  const shifted = syntheticButton(1, 10);
  const expected = measureTextInkCenter(reference, box, 1);
  const actual = measureTextInkCenter(shifted, box, 1);
  assert.ok(Math.abs(textCenterOffsetError(expected, actual) - 2) < 1e-9);
});

test('normalizes text-ink offsets from DPR2 pixels to CSS pixels', () => {
  const reference = syntheticButton(2, 8);
  const shifted = syntheticButton(2, 9);
  const expected = measureTextInkCenter(reference, box, 2);
  const actual = measureTextInkCenter(shifted, box, 2);
  assert.ok(Math.abs(textCenterOffsetError(expected, actual) - 1) < 1e-9);
});

function syntheticButton(scale, inkTopCssPx) {
  const image = new PNG({ width: box.width * scale, height: box.height * scale });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = 103;
    image.data[offset + 1] = 80;
    image.data[offset + 2] = 164;
    image.data[offset + 3] = 255;
  }
  for (let y = inkTopCssPx * scale; y < (inkTopCssPx + 4) * scale; y += 1) {
    for (let x = 14 * scale; x < 26 * scale; x += 1) {
      const offset = (y * image.width + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = 255;
    }
  }
  return image;
}
