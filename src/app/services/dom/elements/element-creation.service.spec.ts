import { ElementCreationService } from './element-creation.service';

describe('ElementCreationService', () => {
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
});
