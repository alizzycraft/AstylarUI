import { DOMAncestryService } from './dom-ancestry.service';
import { StyleService } from './style.service';
import { StyleDefaultsService } from './style-defaults.service';
import { ViewportService } from './positioning/viewport.service';
import type { DOMElement } from '../../types/dom-element';

describe('DOMAncestryService query context', () => {
  it('restores live ancestry and invalidates selector caches after nested queries and errors', () => {
    const ancestry = new DOMAncestryService();
    const style = new StyleService(new StyleDefaultsService(), ancestry, new ViewportService());
    const child: DOMElement = { type: 'span', class: 'caption' };
    const live: DOMElement = { type: 'div', class: 'live', children: [child] };
    const query: DOMElement = { type: 'div', class: 'query', children: [child] };
    const nested: DOMElement = { type: 'div', class: 'nested', children: [child] };
    const rules = [
      { selector: '.live .caption', color: '#111111' },
      { selector: '.query .caption', color: '#222222' },
      { selector: '.nested .caption', color: '#333333' },
    ];
    ancestry.setParent(child, live);
    const color = () => style.findStyleForElement(child, rules)?.color;
    expect(color()).toBe('#111111');
    const revision = ancestry.revision;
    expect(ancestry.withTree(query, () => {
      expect(color()).toBe('#222222');
      expect(() => ancestry.withTree(nested, () => {
        expect(color()).toBe('#333333');
        throw new Error('query failed');
      })).toThrowError('query failed');
      expect(ancestry.getParent(child)).toBe(query);
      return color();
    })).toBe('#222222');
    expect(ancestry.getParent(child)).toBe(live);
    expect(color()).toBe('#111111');
    expect(ancestry.revision).toBeGreaterThan(revision);
  });
});
