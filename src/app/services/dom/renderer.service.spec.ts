import { BabylonDOMRendererService } from './renderer.service';

describe('BabylonDOMRendererService', () => {
  it('accepts text content without an authored element ID', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;

    const validation = renderer['validateTextElement']({
      type: 'span',
      textContent: 'Generated mesh text',
    });

    expect(validation.isValid).toBeTrue();
    expect(validation.errors).toEqual([]);
  });

  it('uses additional baseline leading for compact bold application text', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;

    expect(renderer['getTextBaselineInsetPx']({
      selector: '.status',
      fontSize: '12px',
      fontWeight: '700',
    })).toBe(4);
    expect(renderer['getTextBaselineInsetPx']({
      selector: 'h2',
      fontSize: '16px',
      fontWeight: '700',
    })).toBe(2);
    expect(renderer['getTextBaselineInsetPx']({
      selector: '.caption',
      fontSize: '12px',
      fontWeight: '400',
    })).toBe(2);
    expect(renderer['getTextBaselineInsetPx']({
      selector: 'h1',
      fontSize: '28px',
      fontWeight: '700',
    })).toBe(1);
  });
});
