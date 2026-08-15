import { StackingContextManager } from './stacking-context.manager';
import { DOMAncestryService } from '../dom-ancestry.service';

describe('StackingContextManager', () => {
  it('uses the resolved stylesheet z-index for mesh depth', () => {
    const manager = new StackingContextManager();
    const element = { type: 'div' as const, id: 'layer' };

    expect(manager.calculateZPosition(element, { selector: '#layer', zIndex: '5' }))
      .toBeGreaterThan(manager.calculateZPosition(element, { selector: '#layer', zIndex: '1' }));
  });

  it('keeps a high-z child below a higher sibling parent stacking context', () => {
    const ancestry = new DOMAncestryService();
    const manager = new StackingContextManager(ancestry);
    const lower = { type: 'div' as const, id: 'lower' };
    const child = { type: 'div' as const, id: 'child' };
    const upper = { type: 'div' as const, id: 'upper' };
    ancestry.setParent(child, lower);

    const lowerDepth = manager.calculateZPosition(lower, {
      selector: '#lower', position: 'absolute', zIndex: '1',
    });
    const childLocalDepth = manager.calculateZPosition(child, {
      selector: '#child', position: 'absolute', zIndex: '100',
    });
    const upperDepth = manager.calculateZPosition(upper, {
      selector: '#upper', position: 'absolute', zIndex: '2',
    });

    expect(lowerDepth + childLocalDepth).toBeLessThan(upperDepth);
    expect(lowerDepth + childLocalDepth).toBeGreaterThan(lowerDepth);
  });

  it('reserves a stable paint band between adjacent root stacking contexts', () => {
    const manager = new StackingContextManager();
    const backdrop = { type: 'div' as const, id: 'backdrop' };
    const dialog = { type: 'section' as const, id: 'dialog' };

    const backdropDepth = manager.calculateZPosition(backdrop, {
      selector: '#backdrop', position: 'fixed', zIndex: '20', opacity: '0.6',
    });
    const dialogDepth = manager.calculateZPosition(dialog, {
      selector: '#dialog', position: 'fixed', zIndex: '21',
    });

    expect(dialogDepth - backdropDepth).toBeGreaterThan(0.2);
  });
});
