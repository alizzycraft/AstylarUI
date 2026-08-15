import { DOMElement } from '../../types/dom-element';
import { StyleRule } from '../../types/style-rule';
import { StyleDefaultsService } from './style-defaults.service';
import { StyleService } from './style.service';
import { DOMAncestryService } from './dom-ancestry.service';
import { ViewportService } from './positioning/viewport.service';

describe('StyleService cascade', () => {
  let service: StyleService;
  let ancestry: DOMAncestryService;
  let viewport: ViewportService;

  beforeEach(() => {
    ancestry = new DOMAncestryService();
    viewport = new ViewportService();
    viewport.updateViewport({ width: 800, height: 600 });
    service = new StyleService(new StyleDefaultsService(), ancestry, viewport);
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

  it('matches child combinators only against the immediate parent', () => {
    const card: DOMElement = { type: 'section', class: 'child-card' };
    const direct: DOMElement = { type: 'div', class: 'status-chip' };
    const wrapper: DOMElement = { type: 'div', class: 'wrapper' };
    const nested: DOMElement = { type: 'div', class: 'status-chip' };
    ancestry.setParent(direct, card);
    ancestry.setParent(wrapper, card);
    ancestry.setParent(nested, wrapper);

    const styles: StyleRule[] = [
      { selector: '.status-chip', background: '#fee2e2' },
      { selector: '.child-card > .status-chip', background: '#dbeafe' },
    ];

    expect(service.findStyleForElement(direct, styles)?.background).toBe('#dbeafe');
    expect(service.findStyleForElement(nested, styles)?.background).toBe('#fee2e2');
    expect(service.matchesSelector(direct, '.child-card>.status-chip')).toBeTrue();
    expect(service.matchesSelector(nested, '.child-card > .status-chip')).toBeFalse();
  });

  it('matches adjacent combinators only against the immediately preceding sibling', () => {
    const lead: DOMElement = { type: 'div', class: 'lead' };
    const adjacent: DOMElement = { type: 'div', class: 'sibling-item' };
    const later: DOMElement = { type: 'div', class: 'sibling-item' };
    const panel: DOMElement = { type: 'section', children: [lead, adjacent, later] };
    ancestry.setParent(lead, panel);
    ancestry.setParent(adjacent, panel);
    ancestry.setParent(later, panel);

    const styles: StyleRule[] = [
      { selector: '.sibling-item', background: '#fee2e2' },
      { selector: '.lead + .sibling-item', background: '#dcfce7' },
    ];

    expect(service.findStyleForElement(adjacent, styles)?.background).toBe('#dcfce7');
    expect(service.findStyleForElement(later, styles)?.background).toBe('#fee2e2');
    expect(service.matchesSelector(adjacent, '.lead+.sibling-item')).toBeTrue();
    expect(service.matchesSelector(later, '.lead + .sibling-item')).toBeFalse();
  });

  it('matches general sibling combinators against any preceding sibling', () => {
    const before: DOMElement = { type: 'div', class: 'general-item' };
    const lead: DOMElement = { type: 'div', class: 'general-lead' };
    const first: DOMElement = { type: 'div', class: 'general-item' };
    const second: DOMElement = { type: 'div', class: 'general-item' };
    const panel: DOMElement = { type: 'section', children: [before, lead, first, second] };
    for (const child of panel.children ?? []) ancestry.setParent(child, panel);

    const styles: StyleRule[] = [
      { selector: '.general-item', background: '#fee2e2' },
      { selector: '.general-lead ~ .general-item', background: '#ede9fe' },
    ];

    expect(service.findStyleForElement(before, styles)?.background).toBe('#fee2e2');
    expect(service.findStyleForElement(first, styles)?.background).toBe('#ede9fe');
    expect(service.findStyleForElement(second, styles)?.background).toBe('#ede9fe');
    expect(service.matchesSelector(second, '.general-lead~.general-item')).toBeTrue();
    expect(service.matchesSelector(before, '.general-lead ~ .general-item')).toBeFalse();
  });

  it('matches first and last child pseudo-classes with class specificity', () => {
    const first: DOMElement = { type: 'div', class: 'edge-item' };
    const middle: DOMElement = { type: 'div', class: 'edge-item' };
    const last: DOMElement = { type: 'div', class: 'edge-item' };
    const list: DOMElement = { type: 'section', children: [first, middle, last] };
    for (const child of list.children ?? []) ancestry.setParent(child, list);

    const styles: StyleRule[] = [
      { selector: '.edge-item:first-child', background: '#dcfce7' },
      { selector: '.edge-item:last-child', background: '#dbeafe' },
      { selector: '.edge-item', background: '#f1f5f9' },
    ];

    expect(service.findStyleForElement(first, styles)?.background).toBe('#dcfce7');
    expect(service.findStyleForElement(middle, styles)?.background).toBe('#f1f5f9');
    expect(service.findStyleForElement(last, styles)?.background).toBe('#dbeafe');
    expect(service.matchesSelector(first, ':first-child')).toBeTrue();
    expect(service.matchesSelector(last, ':last-child')).toBeTrue();
    expect(service.matchesSelector(middle, ':first-child')).toBeFalse();
  });

  it('applies media-bounded rules against the current viewport', () => {
    const element: DOMElement = { type: 'div', id: 'media-card' };
    const styles: StyleRule[] = [
      { selector: '#media-card', width: '60vw', background: '#dbeafe' },
      { selector: '#media-card', mediaMaxWidth: '700px', width: '70vw', background: '#ede9fe' },
      { selector: '#media-card', mediaMaxWidth: '31.25rem', width: '80vw', background: '#dcfce7' },
    ];

    expect(service.findStyleForElement(element, styles)?.width).toBe('60vw');
    viewport.updateViewport({ width: 640 });
    expect(service.findStyleForElement(element, styles)?.width).toBe('70vw');
    viewport.updateViewport({ width: 390 });
    expect(service.findStyleForElement(element, styles)?.width).toBe('80vw');
  });
});
