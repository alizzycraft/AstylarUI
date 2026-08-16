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
});
