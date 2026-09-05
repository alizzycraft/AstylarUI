import { BabylonDOMRendererService } from './renderer.service';
import { DOMAncestryService } from './dom-ancestry.service';
import { DOMElement } from '../../types/dom-element';

describe('BabylonDOMRendererService', () => {
  it('inherits caret and pointer hit-testing styles into rendered descendants', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;

    expect(renderer['pickInheritedTextProperties']({
      selector: '#parent', caretColor: 'transparent', pointerEvents: 'none',
    })).toEqual({ caretColor: 'transparent', pointerEvents: 'none' });
  });

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

  it('does not displace a line box after the text canvas has positioned its baseline', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;
    const textMesh = {
      parent: undefined,
      position: { x: 0, y: 0, z: 0 },
    };
    const parentMesh = {
      getBoundingInfo: () => ({
        boundingBox: {
          minimum: { x: -53.5, y: -12 },
          maximum: { x: 53.5, y: 12 },
        },
      }),
    };

    renderer['positionTextMesh'](
      textMesh as never,
      parentMesh as never,
      { width: 80, height: 16 },
      { selector: '.tooltip', fontSize: '12px', lineHeight: '16px' },
      { top: 4, right: 8, bottom: 4, left: 8 },
      { width: 107, height: 24, padding: { top: 4, right: 8, bottom: 4, left: 8 } },
    );

    expect(textMesh.position.y).toBe(0);
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
