import { TestBed } from '@angular/core/testing';
import { Astylar, type AstylarResolvedStyleSnapshot, type SiteData } from 'astylarui';

describe('packed style inspection API', () => {
  it('inspects hidden inputs and state through isolated package-root surfaces', async () => {
    const makeCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 150;
      document.body.appendChild(canvas);
      return canvas;
    };
    const firstCanvas = makeCanvas(), secondCanvas = makeCanvas();
    const makeData = (color: string): SiteData => ({ root: { children: [
      { type: 'button', id: 'action', value: 'Action' },
      { type: 'div', id: 'hidden', children: [{ type: 'span', textContent: 'Hidden' }] },
      { type: 'div', id: 'parent', children: [{ type: 'div', id: 'child', textContent: 'Inherited type' }] },
    ] }, styles: [
      { selector: '#action', width: '100px', height: '40px', background: color, color, fontSize: '16px', lineHeight: '24px' },
      { selector: '#action:focus', background: '#abcdef', color: '#fedcba' },
      { selector: '#hidden', display: 'none' },
      { selector: '#hidden > span', color, width: '50%' },
      { selector: '#parent', width: '200px', height: '50px', fontSize: '24px', lineHeight: '32px', color },
    ] });
    const astylar = TestBed.inject(Astylar);
    const first = astylar.mount(firstCanvas, makeData('#112233'));
    const second = astylar.mount(secondCanvas, makeData('#445566'));
    try {
      await Promise.all([first.whenSettled(), second.whenSettled()]);
      const snapshot: AstylarResolvedStyleSnapshot = first.inspectResolvedStyles();
      expect(snapshot.elements.map((entry) => entry.path)).toEqual(['root/0', 'root/1', 'root/1/0', 'root/2', 'root/2/0']);
      expect(snapshot.elements[1].normal.display).toBe('none');
      expect(snapshot.elements[2].normal.color).toBe('#112233');
      expect(snapshot.elements[2].normal.width).toBe('50%');
      expect(second.inspectResolvedStyles().elements[2].normal.color).toBe('#445566');
      const control = snapshot.elements[0];
      expect(control.retainedText).toBeUndefined();
      expect(control.paintedControlText?.source).toBe('core-control-texture');
      expect(control.paintedControlText?.text).toBe('Action');
      expect(control.paintedControlText?.style.fontSize).toBe(16);
      expect(control.paintedControlText?.style.lineHeight).toBe(1.5);
      expect(control.paintedControlText?.style.color).toBe('#112233');
      expect(second.inspectResolvedStyles().elements[0].paintedControlText?.style.color).toBe('#445566');
      const text = snapshot.elements.find((entry) => entry.id === 'child')!;
      expect(text.retainedText?.source).toBe('core-text-registry');
      expect(text.retainedText?.style.fontSize).toBe('24px');
      expect(text.retainedText?.style.lineHeight).toBe('32px');
      expect(text.retainedText?.style.color).toBe('#112233');
      expect(second.inspectResolvedStyles().elements.find((entry) => entry.id === 'child')?.retainedText?.style.color).toBe('#445566');
      // Replacing serializable objects may reuse the visual tree. Hidden-node
      // selectors must still resolve against the newly submitted ancestry.
      const mesh = first.scene.getMeshByName('action');
      const next = makeData('#112233');
      next.root.children[0].ariaLabel = 'Updated action';
      const before = JSON.stringify(next);
      await first.update(next);
      await first.whenSettled();
      expect(first.diagnostics.reconciliation?.strategy).toBe('reuse');
      expect(first.scene.getMeshByName('action')).toBe(mesh);
      expect(first.inspectResolvedStyles().elements[2].normal.color).toBe('#112233');
      expect(first.inspectResolvedStyles().elements[2].normal.width).toBe('50%');
      expect(second.inspectResolvedStyles().elements[2].normal.color).toBe('#445566');
      expect(JSON.stringify(next)).toBe(before);
      expect(first.focus('action', { scrollIntoView: false })).toBeTrue();
      expect(first.inspectResolvedStyles().elements[0].effective.background).toBe('#abcdef');
      expect(first.inspectResolvedStyles().elements[0].paintedControlText?.style.color).toBe('#fedcba');
      expect(second.inspectResolvedStyles().elements[0].paintedControlText?.style.color).toBe('#445566');
      expect(second.inspectResolvedStyles().elements[0].effective.background).toBe('#445566');
      first.dispose();
      expect(() => first.inspectResolvedStyles()).toThrowError(/disposed/);
      expect(second.inspectResolvedStyles().elements.length).toBe(5);
    } finally {
      if (!first.disposed) first.dispose();
      second.dispose();
      firstCanvas.remove();
      secondCanvas.remove();
    }
  }, 30000);
});
