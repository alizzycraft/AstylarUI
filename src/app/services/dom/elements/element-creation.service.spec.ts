import { ElementCreationService } from './element-creation.service';
import { DOMAncestryService } from '../dom-ancestry.service';
import { BabylonDOM } from '../interfaces/dom.types';
import { DOMElement } from '../../../types/dom-element';

describe('ElementCreationService', () => {
  it('normalizes a built-in control root to the retained CSS layout identity', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;
    const controlMesh = { name: 'button_item-one-action' };

    service['normalizeElementMeshIdentity'](controlMesh as never, 'item-one-action');

    expect(controlMesh.name).toBe('item-one-action');
  });

  it('calculates auto block height from padding, children, and collapsed sibling margins', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;

    const flow = service['calculateBlockFlow'](18, 18, [
      { height: 48, marginTop: 0, marginBottom: 12 },
      { height: 64, marginTop: 0, marginBottom: 0 },
    ]);

    expect(flow.tops).toEqual([18, 78]);
    expect(flow.height).toBe(160);
    expect(flow.collapsedMarginTop).toBe(0);
    expect(flow.collapsedMarginBottom).toBe(0);
  });

  it('collapses adjacent positive margins to the larger margin', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;

    const flow = service['calculateBlockFlow'](10, 10, [
      { height: 30, marginTop: 0, marginBottom: 12 },
      { height: 30, marginTop: 20, marginBottom: 0 },
    ]);

    expect(flow.tops).toEqual([10, 60]);
    expect(flow.height).toBe(100);
  });

  it('moves adjoining first and last child margins outside an auto block', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;

    const flow = service['calculateBlockFlow'](
      0,
      0,
      [{ height: 200, marginTop: 8, marginBottom: 12 }],
      true,
      true,
    );

    expect(flow.tops).toEqual([0]);
    expect(flow.height).toBe(200);
    expect(flow.collapsedMarginTop).toBe(8);
    expect(flow.collapsedMarginBottom).toBe(12);
  });

  it('recognizes a definite height assigned by flex layout', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;

    expect(service['hasFlexAssignedHeight']({
      metadata: { astylarFlexAssignedSize: { width: 140, height: 216 } },
    } as never)).toBeTrue();
    expect(service['hasFlexAssignedHeight']({ metadata: {} } as never)).toBeFalse();
  });

  it('clamps descendant-driven auto height to authored min and max constraints', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;

    expect(service['clampAutoBlockHeight'](120, {
      selector: '#empty', minHeight: '200px',
    })).toBe(200);
    expect(service['clampAutoBlockHeight'](260, {
      selector: '#empty', minHeight: '200px', maxHeight: '220px',
    })).toBe(220);
  });

  it('preserves percentage min-height against the definite containing block during auto reflow', () => {
    const service = Object.create(ElementCreationService.prototype) as ElementCreationService;
    const ancestry = new DOMAncestryService();
    (service as unknown as { ancestry: DOMAncestryService }).ancestry = ancestry;
    const root: DOMElement = { type: 'div', id: 'root-body' };
    const page: DOMElement = { type: 'main', id: 'page' };
    ancestry.setParent(page, root);
    const dom = {
      context: {
        elementDimensions: new Map([['root-body', {
          width: 800,
          height: 600,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        }]]),
        elementStyles: new Map(),
        elements: new Map(),
      },
    } as unknown as BabylonDOM;

    const percentageReference = service['definiteContainingBlockContentHeight'](dom, page);

    expect(service['clampAutoBlockHeight'](120, {
      selector: '#page', minHeight: '100%',
    }, percentageReference)).toBe(600);
  });
});
