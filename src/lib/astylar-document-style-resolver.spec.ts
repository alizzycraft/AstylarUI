import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import { AstylarDiagnostics } from './astylar-diagnostics';
import { AstylarDocumentStyleResolver } from './astylar-document-style-resolver';
import { AstylarDocumentStyleSource } from './astylar-document-style-source';
import { provideAstylar } from './astylar-plugin';

describe('AstylarDocumentStyleResolver', () => {
  let resolver: AstylarDocumentStyleResolver;
  let style: HTMLStyleElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AstylarDiagnostics,
        AstylarDocumentStyleSource,
        AstylarDocumentStyleResolver,
        provideAstylar({ css: { useDocumentStyles: true } }),
      ],
    });
    resolver = TestBed.inject(AstylarDocumentStyleResolver);
    style = document.createElement('style');
    style.dataset['astylarStyleResolverTest'] = '';
    document.head.append(style);
  });

  afterEach(() => {
    resolver.dispose();
    style.remove();
    document.querySelectorAll('[data-astylar-style-resolver]').forEach((node) => node.remove());
    TestBed.resetTestingModule();
  });

  it('resolves layers, variables, calc, modern colors and the surface viewport', () => {
    style.textContent = `
      @layer base { * { box-sizing: border-box; } }
      @layer utilities {
        .card {
          --space: 8px;
          display: flex;
          gap: calc(var(--space) * 2);
          padding: var(--space);
          background-color: oklch(37.2% 0.044 257.287);
        }
        @media (max-width: 600px) { .card { flex-direction: column; } }
      }
    `;
    const element: DOMElement = { type: 'section', id: 'card', class: 'card', children: [] };
    const result = resolver.resolve(document, site(element), { width: 500, height: 400 });
    const normal = result.elements.get(element)!.normal;

    expect(normal.display).toBe('flex');
    expect(normal.rowGap).toBe('16px');
    expect(normal.columnGap).toBe('16px');
    expect(normal.paddingTop).toBe('8px');
    expect(normal.flexDirection).toBe('column');
    expect(normal.boxSizing).toBe('border-box');
    expect(normal.background).toMatch(/^rgb\(/);

    const wide = resolver.resolve(document, site(element), { width: 800, height: 400 });
    expect(wide.elements.get(element)!.normal.flexDirection).toBe('row');
  });

  it('resolves escaped Tailwind-style class selectors and interaction variants', () => {
    style.textContent = `
      .hover\\:border-blue-500 { border: 1px solid rgb(30, 41, 59); }
      .hover\\:border-blue-500:hover { border-color: oklch(62.3% 0.214 259.815); }
      .active\\:scale-95:active { transform: scale(.95); }
      .focus\\:text-black:focus-visible { color: black; }
    `;
    const element: DOMElement = {
      type: 'button',
      id: 'action',
      class: 'hover:border-blue-500 active:scale-95 focus:text-black',
      children: [],
    };
    const result = resolver.resolve(document, site(element), { width: 700, height: 400 });
    const resolved = result.elements.get(element)!;

    expect(Number.parseFloat(resolved.normal.borderWidth!)).toBeCloseTo(1, 0);
    expect(resolved.hover?.borderColor).toMatch(/^rgb\(/);
    expect(resolved.active?.transform).toBe('scale(0.95)');
    expect(resolved.focus?.color).toBe('rgb(0, 0, 0)');
  });

  it('translates Tailwind logical spacing, axis overflow, and individual transforms', () => {
    style.textContent = `
      .utility {
        padding-inline: 12px;
        padding-block: 8px;
        margin-inline-start: 4px;
        overflow-x: auto;
        overflow-y: auto;
      }
      .w-\\[13rem\\] { width: 13rem; }
      .active\\:scale-\\[0\\.98\\]:active { scale: 0.98; }
    `;
    const element: DOMElement = {
      type: 'button', id: 'utility', class: 'utility w-[13rem] active:scale-[0.98]', children: [],
    };
    const resolved = resolver.resolve(document, site(element), { width: 700, height: 400 })
      .elements.get(element)!;

    expect(resolved.normal).toEqual(jasmine.objectContaining({
      paddingTop: '8px',
      paddingRight: '12px',
      paddingBottom: '8px',
      paddingLeft: '12px',
      marginLeft: '4px',
      overflow: 'auto',
      width: '208px',
    }));
    expect(resolved.active?.transform).toBe('scale(0.98)');
  });

  it('translates native control appearance and checked/disabled computed state', () => {
    style.textContent = `
      .control { appearance: none; opacity: .8; color: rgb(15, 23, 42); }
      .control:checked { opacity: 1; }
      .control:disabled { color: rgb(100, 116, 139); }
    `;
    const checked: DOMElement = {
      type: 'input', inputType: 'checkbox', id: 'checked', class: 'control', checked: true,
    };
    const disabled: DOMElement = {
      type: 'input', inputType: 'button', id: 'disabled', class: 'control', disabled: true,
    };
    const result = resolver.resolve(document, site(checked, disabled), { width: 700, height: 400 });

    expect(result.elements.get(checked)?.normal).toEqual(jasmine.objectContaining({
      appearance: 'none',
      opacity: '1',
    }));
    expect(result.elements.get(disabled)?.normal).toEqual(jasmine.objectContaining({
      appearance: 'none',
      color: 'rgb(100, 116, 139)',
    }));
  });

  it('keeps browser defaults out while retaining explicit declarations equal to them', () => {
    style.textContent = '.explicit { display: inline; color: rgb(0, 0, 0); }';
    const explicit: DOMElement = { type: 'span', id: 'explicit', class: 'explicit', children: [] };
    const untouched: DOMElement = { type: 'span', id: 'untouched', children: [] };
    const result = resolver.resolve(document, site(explicit, untouched), { width: 700, height: 400 });

    expect(result.elements.get(explicit)?.normal.display).toBe('inline');
    expect(result.elements.get(explicit)?.normal.color).toBe('rgb(0, 0, 0)');
    expect(result.elements.get(untouched)?.normal.display).toBeUndefined();
  });

  it('diagnoses unsupported declarations only for matching elements and caches identical work', () => {
    const diagnostics = TestBed.inject(AstylarDiagnostics);
    diagnostics.configure({ logLevel: 'silent' });
    style.textContent = `
      .used { filter: blur(2px); display: grid; }
      .unused { mask-image: linear-gradient(black, transparent); }
    `;
    const element: DOMElement = { type: 'div', id: 'used', class: 'used', children: [] };
    const data = site(element);
    const first = resolver.resolve(document, data, { width: 700, height: 400 });
    const second = resolver.resolve(document, data, { width: 700, height: 400 });

    expect(second).toBe(first);
    expect(first.elements.get(element)?.normal.display).toBe('grid');
    expect(diagnostics.snapshot).toContain(jasmine.objectContaining({
      code: 'document-css-declaration-unsupported',
      property: 'filter',
    }));
    expect(diagnostics.snapshot.some(({ property }) => property === 'mask-image')).toBeFalse();
  });
});

function site(...children: DOMElement[]): SiteData {
  return { styles: [], root: { children } };
}
