import { Color3 } from '@babylonjs/core';
import {
  chooseSelectionHighlightColor,
  contrastRatio,
} from './text-highlight-mesh.factory';

describe('text selection highlight contrast', () => {
  it('keeps the selection distinguishable from dark paint and light glyphs', () => {
    const background = Color3.FromHexString('#1a202c');
    const text = Color3.FromHexString('#f7fafc');
    const selection = chooseSelectionHighlightColor(background, text);

    expect(contrastRatio(selection, background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(selection, text)).toBeGreaterThanOrEqual(3);
  });

  it('keeps the selection distinguishable from light paint and dark glyphs', () => {
    const background = Color3.FromHexString('#ffffff');
    const text = Color3.FromHexString('#0f172a');
    const selection = chooseSelectionHighlightColor(background, text);

    expect(contrastRatio(selection, background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(selection, text)).toBeGreaterThanOrEqual(3);
  });
});
