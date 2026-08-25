import { BabylonDOMRendererService } from './renderer.service';
import { DOMAncestryService } from './dom-ancestry.service';
import { DOMElement } from '../../types/dom-element';

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
    })).toBe(3);
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
      selector: 'td',
      fontSize: '16px',
      verticalAlign: 'middle',
    })).toBe(1);
    expect(renderer['getTextBaselineInsetPx']({
      selector: 'h1',
      fontSize: '28px',
      fontWeight: '700',
    })).toBe(1);
  });

  it('registers complete DOM ancestry before intrinsic pre-layout', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;
    const ancestry = new DOMAncestryService();
    (renderer as unknown as { ancestry: DOMAncestryService }).ancestry = ancestry;
    const textarea: DOMElement = { type: 'textarea', id: 'bio' };
    const row: DOMElement = { type: 'div', id: 'row', children: [textarea] };
    const panel: DOMElement = { type: 'section', id: 'panel', children: [row] };
    const root: DOMElement = { type: 'div', id: 'root-body' };

    renderer['registerAncestry']([panel], root);

    expect(ancestry.getParent(panel)).toBe(root);
    expect(ancestry.getParent(row)).toBe(panel);
    expect(ancestry.getParent(textarea)).toBe(row);
  });
});
