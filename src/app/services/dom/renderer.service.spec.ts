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
});
