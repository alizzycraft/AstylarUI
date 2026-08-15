import { DOMElement } from '../../types/dom-element';
import { StyleRule } from '../../types/style-rule';
import { StyleDefaultsService } from './style-defaults.service';
import { StyleService } from './style.service';

describe('StyleService cascade', () => {
  let service: StyleService;

  beforeEach(() => {
    service = new StyleService(new StyleDefaultsService());
  });

  it('resolves specificity before source order', () => {
    const element: DOMElement = { type: 'div', id: 'target', class: 'notice featured' };
    const styles: StyleRule[] = [
      { selector: '#target', background: '#7c3aed' },
      { selector: 'div', background: '#94a3b8' },
      { selector: '.notice', background: '#16a34a' },
      { selector: 'div.notice.featured', color: '#123456' },
    ];

    const result = service.findStyleForElement(element, styles);

    expect(result?.background).toBe('#7c3aed');
    expect(result?.color).toBe('#123456');
  });

  it('uses stylesheet source order rather than class attribute order', () => {
    const element: DOMElement = { type: 'div', class: 'later earlier' };
    const styles: StyleRule[] = [
      { selector: '.earlier', background: '#dc2626' },
      { selector: '.later', background: '#2563eb' },
    ];

    expect(service.findStyleForElement(element, styles)?.background).toBe('#2563eb');
  });

  it('keeps inline declarations above stylesheet and context declarations', () => {
    const element: DOMElement = {
      type: 'div',
      id: 'inline-target',
      style: { background: '#f97316' },
    };
    const styles: StyleRule[] = [{ selector: '#inline-target', background: '#7c3aed' }];
    const context = new Map([
      ['inline-target', { normal: { selector: '#inline-target', background: '#0891b2' } }],
    ]);

    expect(service.findStyleForElement(element, styles, context)?.background).toBe('#f97316');
  });
});
