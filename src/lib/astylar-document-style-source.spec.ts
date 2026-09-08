import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AstylarDiagnostics } from './astylar-diagnostics';
import { AstylarDocumentStyleSource } from './astylar-document-style-source';
import { provideAstylar } from './astylar-plugin';

describe('AstylarDocumentStyleSource', () => {
  afterEach(() => {
    document.head.querySelectorAll('[data-astylar-style-source-test]').forEach((node) => node.remove());
    TestBed.resetTestingModule();
  });

  it('remains disabled unless document styles are explicitly enabled', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), AstylarDiagnostics, AstylarDocumentStyleSource],
    });
    const source = TestBed.inject(AstylarDocumentStyleSource);

    expect(source.snapshot(document)).toEqual({
      enabled: false,
      fingerprint: 'disabled',
      sheets: [],
    });
  });

  it('discovers inspectable style elements in document order without fetching', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AstylarDiagnostics,
        AstylarDocumentStyleSource,
        provideAstylar({ css: { useDocumentStyles: true } }),
      ],
    });
    const first = document.createElement('style');
    first.dataset['astylarStyleSourceTest'] = '';
    first.id = 'loaded-first';
    first.textContent = '@layer utilities { .gap\\:4 { gap: 16px; } }';
    const second = document.createElement('style');
    second.dataset['astylarStyleSourceTest'] = '';
    second.textContent = '@media (max-width: 720px) { .stack { flex-direction: column; } }';
    document.head.append(first, second);

    const snapshot = TestBed.inject(AstylarDocumentStyleSource).snapshot(document);
    const relevant = snapshot.sheets.filter(({ source }) =>
      source === 'style#loaded-first' || source.startsWith('style['));

    expect(snapshot.enabled).toBeTrue();
    expect(relevant.some(({ cssText }) => cssText.includes('.gap\\:4'))).toBeTrue();
    expect(relevant.some(({ cssText }) => cssText.includes('@media'))).toBeTrue();
    expect(snapshot.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });

  it('reports inaccessible stylesheets once and continues with later sheets', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AstylarDiagnostics,
        AstylarDocumentStyleSource,
        provideAstylar({ css: { useDocumentStyles: true } }),
      ],
    });
    const source = TestBed.inject(AstylarDocumentStyleSource);
    const diagnostics = TestBed.inject(AstylarDiagnostics);
    diagnostics.configure({ logLevel: 'silent' });
    const inaccessible = {
      href: 'https://cross-origin.example/styles.css',
      get cssRules(): CSSRuleList {
        throw new DOMException('Blocked by CORS', 'SecurityError');
      },
    };
    const style = document.createElement('style');
    style.textContent = '.card { display: flex; }';
    document.head.append(style);

    const snapshot = source.snapshotStyleSheets([
      inaccessible,
      style.sheet!,
      inaccessible,
    ]);

    expect(snapshot.sheets.length).toBe(1);
    expect(snapshot.sheets[0].cssText).toContain('display: flex');
    expect(diagnostics.snapshot.filter(({ code }) =>
      code === 'document-stylesheet-inaccessible').length).toBe(1);
  });

  it('coalesces stylesheet mutations and disconnects its owned observer', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AstylarDiagnostics,
        AstylarDocumentStyleSource,
        provideAstylar({ css: { useDocumentStyles: true } }),
      ],
    });
    const source = TestBed.inject(AstylarDocumentStyleSource);
    let invalidations = 0;
    const disconnect = source.observe(document, () => invalidations++);
    const unrelated = document.createElement('div');
    document.body.append(unrelated);
    unrelated.textContent = 'Semantic mirror updates must not invalidate CSS.';
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(invalidations).toBe(0);

    const style = document.createElement('style');
    style.dataset['astylarStyleSourceTest'] = '';
    document.head.append(style);
    style.textContent = '.late { color: red; }';
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(invalidations).toBe(1);
    disconnect();
    style.textContent = '.late { color: blue; }';
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(invalidations).toBe(1);
    unrelated.remove();
  });
});
