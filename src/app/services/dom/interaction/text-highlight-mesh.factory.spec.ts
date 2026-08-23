import { Color3 } from '@babylonjs/core';
import {
  chooseSelectionColors,
  chooseSelectionHighlightColor,
  contrastRatio,
} from './text-highlight-mesh.factory';

describe('text selection highlight contrast', () => {
  it('keeps the selection distinguishable from dark paint and light glyphs', () => {
    const background = Color3.FromHexString('#1a202c');
    const selection = chooseSelectionColors(background);

    expect(contrastRatio(selection.background, background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(selection.foreground, selection.background)).toBeGreaterThanOrEqual(4.5);
    expect(selection.foreground.toHexString().toLowerCase()).toBe('#000000');
  });

  it('keeps the selection distinguishable from light paint and dark glyphs', () => {
    const background = Color3.FromHexString('#ffffff');
    const selection = chooseSelectionColors(background);

    expect(contrastRatio(selection.background, background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(selection.foreground, selection.background)).toBeGreaterThanOrEqual(4.5);
    expect(selection.foreground.toHexString().toLowerCase()).toBe('#ffffff');
  });

  it('keeps the compatibility helper aligned with the paired background choice', () => {
    const background = Color3.FromHexString('#1a202c');
    const text = Color3.FromHexString('#f7fafc');

    expect(chooseSelectionHighlightColor(background, text).toHexString())
      .toBe(chooseSelectionColors(background).background.toHexString());
  });

  it('falls back to black or white on mid-tone surfaces that defeat the preferred blue', () => {
    for (const backgroundHex of ['#777777', '#8f8f8f']) {
      const background = Color3.FromHexString(backgroundHex);
      const selection = chooseSelectionColors(background);

      expect(contrastRatio(selection.background, background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(selection.foreground, selection.background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
