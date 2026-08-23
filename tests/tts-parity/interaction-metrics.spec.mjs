import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateInteractionRaster,
  hasRasterColor,
  selectionCaretOffset,
  selectionGlyphAlignment,
} from './interaction-metrics.mjs';

function image(width, height, painter) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const color = painter(x, y);
    const offset = (y * width + x) * 4;
    data.set([...color, 255], offset);
  }
  return { width, height, data };
}

function button({ shift = 0, background = [35, 134, 54], blur = false } = {}) {
  return image(120, 52, (x, y) => {
    const ring = x === 3 + shift || x === 116 + shift || y === 3 + shift || y === 48 + shift;
    const glyph = x >= 48 && x <= 72 && (y === 23 || y === 24 || (x === 48 && y >= 16 && y <= 31));
    if (ring) return [31, 111, 235];
    if (glyph) return blur ? [145, 190, 154] : [255, 255, 255];
    return background;
  });
}

test('an exact interaction crop passes', () => {
  const reference = button();
  assert.equal(evaluateInteractionRaster(reference, reference).meetsTarget, true);
});

test('one-pixel raster phase remains acceptable', () => {
  const reference = button();
  const shiftedGlyph = image(reference.width, reference.height, (x, y) => {
    const sx = Math.max(0, x - 1);
    const offset = (y * reference.width + sx) * 4;
    return [...reference.data.subarray(offset, offset + 3)];
  });
  assert.equal(evaluateInteractionRaster(reference, shiftedGlyph).meetsTarget, true);
});

test('a wrong authored hover color fails', () => {
  assert.equal(evaluateInteractionRaster(button(), button({ background: [110, 45, 45] })).meetsTarget, false);
});

test('a missing focus ring fails', () => {
  const reference = button();
  const missing = image(120, 52, (x, y) => {
    const offset = (y * reference.width + x) * 4;
    const isRing = x === 3 || x === 116 || y === 3 || y === 48;
    return isRing ? [35, 134, 54] : [...reference.data.subarray(offset, offset + 3)];
  });
  assert.equal(evaluateInteractionRaster(reference, missing).meetsTarget, false);
});

test('a shifted focus ring fails', () => {
  assert.equal(evaluateInteractionRaster(button(), button({ shift: 4 })).meetsTarget, false);
});

test('blurred control text fails', () => {
  assert.equal(evaluateInteractionRaster(button(), button({ blur: true })).meetsTarget, false);
});

test('selection foreground sampling requires the requested color inside the projected box', () => {
  const capture = image(20, 20, (x, y) => x === 9 && y === 10 ? [0, 0, 0] : [154, 213, 255]);
  const canvas = { width: 10, height: 10 };

  assert.equal(hasRasterColor(capture, { left: 4, top: 4, right: 6, bottom: 6 }, '#000000', canvas), true);
  assert.equal(hasRasterColor(capture, { left: 0, top: 0, right: 2, bottom: 2 }, '#000000', canvas), false);
});

test('selection glyph alignment rejects a recolor sampled from the wrong texture positions', () => {
  const glyph = (x, y) => (x === 4 && y >= 3 && y <= 8) || (y === 8 && x >= 4 && x <= 9);
  const unselected = image(16, 12, (x, y) => glyph(x, y) ? [240, 240, 240] : [25, 32, 44]);
  const aligned = image(16, 12, (x, y) => glyph(x, y) ? [0, 0, 0] : [154, 213, 255]);
  const shifted = image(16, 12, (x, y) => glyph(x - 6, y) ? [0, 0, 0] : [154, 213, 255]);
  const box = { left: 0, top: 0, right: 16, bottom: 12 };
  const canvas = { width: 16, height: 12 };

  assert.equal(selectionGlyphAlignment(
    unselected, aligned, box, '#f0f0f0', '#000000', '#19202c', '#9ad5ff', canvas,
  ), 1);
  assert.ok(selectionGlyphAlignment(
    unselected, shifted, box, '#f0f0f0', '#000000', '#19202c', '#9ad5ff', canvas,
  ) < 0.5);
});

test('selection caret offset follows the active edge for forward and backward ranges', () => {
  const highlights = [{ left: 10, right: 20 }, { left: 4, right: 14 }];

  assert.equal(selectionCaretOffset({ left: 19, right: 21 }, highlights, 'forward'), 0);
  assert.equal(selectionCaretOffset({ left: 3, right: 5 }, highlights, 'backward'), 0);
  assert.equal(selectionCaretOffset({ left: 29, right: 31 }, highlights, 'forward'), 10);
});
