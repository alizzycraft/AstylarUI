import { DOMElement } from '../../types/dom-element';
import { StyleRule } from '../../types/style-rule';
import { StyleDefaultsService } from './style-defaults.service';
import { StyleService } from './style.service';
import { DOMAncestryService } from './dom-ancestry.service';

describe('StyleService cascade', () => {
  let service: StyleService;
  let ancestry: DOMAncestryService;

  beforeEach(() => {
    ancestry = new DOMAncestryService();
    service = new StyleService(new StyleDefaultsService(), ancestry);
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

  it('applies universal declarations at zero specificity', () => {
    const element: DOMElement = { type: 'div', class: 'accent' };
    const styles: StyleRule[] = [
      { selector: '*', background: '#e2e8f0', color: '#334155', padding: '10px' },
      { selector: 'div', background: '#bfdbfe' },
      { selector: '.accent', color: '#9a3412' },
    ];

    const result = service.findStyleForElement(element, styles);

    expect(result?.padding).toBe('10px');
    expect(result?.background).toBe('#bfdbfe');
    expect(result?.color).toBe('#9a3412');
    expect(service.matchesSelector(element, '*')).toBeTrue();
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

  it('matches scoped descendant selectors through multiple ancestors', () => {
    const card: DOMElement = { type: 'section', class: 'selector-card' };
    const content: DOMElement = { type: 'div', class: 'selector-content' };
    const target: DOMElement = { type: 'div', class: 'badge' };
    const outside: DOMElement = { type: 'div', class: 'badge' };
    ancestry.setParent(content, card);
    ancestry.setParent(target, content);

    const styles: StyleRule[] = [
      { selector: '.selector-card .badge', background: '#dcfce7' },
      { selector: '.badge', background: '#fee2e2' },
      { selector: '.selector-card .selector-content div.badge', color: '#14532d' },
    ];

    expect(service.findStyleForElement(target, styles)?.background).toBe('#dcfce7');
    expect(service.findStyleForElement(target, styles)?.color).toBe('#14532d');
    expect(service.findStyleForElement(outside, styles)?.background).toBe('#fee2e2');
    expect(service.findStyleForElement(outside, styles)?.color).toBeUndefined();
    expect(service.matchesSelector(target, '.selector-card .badge')).toBeTrue();
    expect(service.matchesSelector(outside, '.selector-card .badge')).toBeFalse();
  });
});
