import { StackingContextManager } from './stacking-context.manager';

describe('StackingContextManager', () => {
  it('uses the resolved stylesheet z-index for mesh depth', () => {
    const manager = new StackingContextManager();
    const element = { type: 'div' as const, id: 'layer' };

    expect(manager.calculateZPosition(element, { selector: '#layer', zIndex: '5' }))
      .toBeGreaterThan(manager.calculateZPosition(element, { selector: '#layer', zIndex: '1' }));
  });
});
