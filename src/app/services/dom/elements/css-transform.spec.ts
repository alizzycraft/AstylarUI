import { cssTranslationToRenderOffset, parseCssTransform } from './css-transform';

describe('CSS transform coordinates', () => {
  it('parses equivalent translate syntaxes without losing fractional pixels', () => {
    expect(parseCssTransform('translate(1.25px, -2.5px)')?.translate)
      .toEqual({ x: 1.25, y: -2.5, z: 0 });
    expect(parseCssTransform('translateX(1.25px) translateY(-2.5px)')?.translate)
      .toEqual({ x: 1.25, y: -2.5, z: 0 });
  });

  it('maps positive CSS right/down translations at the render boundary', () => {
    const transform = parseCssTransform('translate(1.5px, 2.5px)')!;

    expect(cssTranslationToRenderOffset(transform, 2)).toEqual({ x: 3, y: -5, z: 0 });
    expect(cssTranslationToRenderOffset(transform, 4)).toEqual({ x: 6, y: -10, z: 0 });
  });

  it('preserves the same CSS displacement when projected at different DPR scales', () => {
    const transform = parseCssTransform('translate(0, 0.5px)')!;
    const dpr1 = cssTranslationToRenderOffset(transform, 2);
    const dpr2 = cssTranslationToRenderOffset(transform, 4);

    expect(dpr1.y / 2).toBeCloseTo(-0.5);
    expect(dpr2.y / 4).toBeCloseTo(-0.5);
  });
});
