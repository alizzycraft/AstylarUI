import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SiteData } from '../app/types/site-data';
import { Astylar, ASTYLAR_INTERNAL_INSPECTION } from './astylar';
import { provideAstylar } from './astylar-plugin';

describe('loaded document style surface integration', () => {
  let style: HTMLStyleElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideAstylar({ css: { useDocumentStyles: true } }),
      ],
    });
    style = document.createElement('style');
    style.dataset['astylarLoadedIntegrationTest'] = '';
    document.head.append(style);
    canvas = document.createElement('canvas');
    canvas.style.width = '640px';
    canvas.style.height = '360px';
    document.body.append(canvas);
  });

  afterEach(() => {
    style.remove();
    canvas.remove();
    document.querySelectorAll('[data-astylar-style-resolver]').forEach((node) => node.remove());
    TestBed.resetTestingModule();
  });

  it('feeds loaded CSS through the existing cascade and invalidates on replacement', async () => {
    style.textContent = `
      .loaded-live {
        display: flex;
        padding: 12px;
        background-color: rgb(15, 23, 42);
      }
    `;
    const astylar = TestBed.inject(Astylar);
    const surface = astylar.mount(canvas, site(), { diagnostics: { logLevel: 'silent' } });

    try {
      await surface.whenSettled();
      const inspection = astylar[ASTYLAR_INTERNAL_INSPECTION](surface.scene)!;
      const initial = inspection.elementManager.elementDimensionsMap.get('loaded')!;
      expect(initial.padding.top).toBe(12);
      expect(initial.padding.right).toBe(12);
      const revision = surface.diagnostics.session!.revision;

      style.textContent = `
        .loaded-live {
          display: grid;
          padding: 20px;
          background-color: rgb(15, 23, 42);
        }
      `;
      await waitFor(() => (surface.diagnostics.session?.revision ?? 0) > revision);
      await surface.whenSettled();

      const updated = inspection.elementManager.elementDimensionsMap.get('loaded')!;
      expect(updated.padding.top).toBe(20);
      expect(updated.padding.right).toBe(20);
    } finally {
      surface.dispose();
    }

    expect(document.querySelectorAll('[data-astylar-style-resolver]').length).toBe(0);
  });
});

function site(): SiteData {
  return {
    root: {
      children: [{
        type: 'section',
        id: 'loaded',
        class: 'loaded-live',
        textContent: 'Loaded CSS',
        children: [],
      }],
    },
    styles: [{ selector: '#loaded', background: '#1e293b' }],
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('Timed out waiting for loaded stylesheet reflow.');
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
}
