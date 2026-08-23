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

  it('separates positioned auto-z descendants from their parent surface', () => {
    const ancestry = new DOMAncestryService();
    const manager = new StackingContextManager(ancestry);
    const root = { type: 'div' as const, id: 'root' };
    const parent = { type: 'main' as const, id: 'content' };
    const child = { type: 'article' as const, id: 'card' };
    ancestry.setParent(parent, root);
    ancestry.setParent(child, parent);

    manager.calculateZPosition(root, { selector: '#root' });
    const parentDepth = manager.calculateZPosition(parent, { selector: '#content' });
    const childLocalDepth = manager.calculateZPosition(child, {
      selector: '#card', position: 'absolute',
    });

    expect(childLocalDepth).toBeGreaterThan(0.1);
    expect(parentDepth + childLocalDepth).toBeGreaterThan(parentDepth);
  });

  it('reserves stable paint depth for semantic table descendants', () => {
    const ancestry = new DOMAncestryService();
    const manager = new StackingContextManager(ancestry);
    const table = { type: 'table' as const, id: 'table' };
    const body = { type: 'tbody' as const, id: 'body' };
    const row = { type: 'tr' as const, id: 'row' };
    const cell = { type: 'td' as const, id: 'cell' };
    ancestry.setParent(body, table);
    ancestry.setParent(row, body);
    ancestry.setParent(cell, row);

    manager.calculateZPosition(table, { selector: '#table' });
    const bodyDepth = manager.calculateZPosition(body, { selector: '#body' });
    const rowDepth = manager.calculateZPosition(row, { selector: '#row' });
    const cellDepth = manager.calculateZPosition(cell, { selector: '#cell' });

    expect(bodyDepth).toBeCloseTo(0.05, 8);
    expect(rowDepth).toBeCloseTo(0.05, 8);
    expect(cellDepth).toBeCloseTo(0.05, 8);
  });
});
