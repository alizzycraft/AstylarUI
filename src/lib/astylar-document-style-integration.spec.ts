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

  it('carries an escaped arbitrary width through loaded CSS and flex layout', async () => {
    style.textContent = `
      .utility-parent { display: flex; flex-direction: row; width: 600px; }
      .w-\\[13rem\\] { width: 13rem; min-width: 0; max-width: 100%; }
    `;
    const astylar = TestBed.inject(Astylar);
    const surface = astylar.mount(canvas, {
      styles: [],
      root: {
        children: [{
          type: 'section', id: 'utility-parent', class: 'utility-parent', children: [{
            type: 'div', id: 'arbitrary-width', class: 'w-[13rem]', children: [],
          }],
        }],
      },
    }, { diagnostics: { logLevel: 'silent' } });

    try {
      await surface.whenSettled();
      const inspection = astylar[ASTYLAR_INTERNAL_INSPECTION](surface.scene)!;
      expect(inspection.elementManager.elementDimensionsMap.get('arbitrary-width')?.width)
        .toBeCloseTo(208, 0);
    } finally {
      surface.dispose();
    }
  });

  it('matches equivalent explicit StyleRule layout and paint values', async () => {
    style.textContent = `
      .loaded-equivalent {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 240px;
        height: 120px;
        padding: 16px;
        gap: 12px;
        border: 2px solid rgb(59, 130, 246);
        background-color: rgb(15, 23, 42);
        color: rgb(226, 232, 240);
      }
    `;
    const astylar = TestBed.inject(Astylar);
    const loaded = astylar.mount(canvas, equivalentSite(true), { diagnostics: { logLevel: 'silent' } });
    try {
      await loaded.whenSettled();
      const loadedInspection = astylar[ASTYLAR_INTERNAL_INSPECTION](loaded.scene)!;
      const loadedDimensions = loadedInspection.elementManager.elementDimensionsMap.get('equivalent')!;
      const loadedBackground = backgroundHex(loaded, 'equivalent');
      loaded.dispose();

      const explicit = astylar.mount(canvas, equivalentSite(false), { diagnostics: { logLevel: 'silent' } });
      try {
        await explicit.whenSettled();
        const explicitInspection = astylar[ASTYLAR_INTERNAL_INSPECTION](explicit.scene)!;
        const explicitDimensions = explicitInspection.elementManager.elementDimensionsMap.get('equivalent')!;
        expect(loadedDimensions.width).toBeCloseTo(explicitDimensions.width, 0);
        expect(loadedDimensions.height).toBeCloseTo(explicitDimensions.height, 0);
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
          expect(loadedDimensions.padding[side]).withContext(`padding.${side}`)
            .toBeCloseTo(explicitDimensions.padding[side], 0);
        }

        expect(backgroundHex(explicit, 'equivalent')).toBe(loadedBackground);
      } finally {
        explicit.dispose();
      }
    } finally {
      loaded.dispose();
    }
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

function backgroundHex(surface: ReturnType<Astylar['mount']>, elementId: string): string | undefined {
  const mesh = surface.scene.meshes.find(
    (candidate) => candidate.metadata?.elementId === elementId && !candidate.isDisposed(),
  );
  const material = mesh?.material as { diffuseColor?: { toHexString(): string } } | null;
  return material?.diffuseColor?.toHexString();
}

function equivalentSite(loaded: boolean): SiteData {
  return {
    root: {
      children: [{
        type: 'section', id: 'equivalent', class: loaded ? 'loaded-equivalent' : undefined,
        children: [],
      }],
    },
    styles: loaded ? [] : [{
      selector: '#equivalent', boxSizing: 'border-box', display: 'flex',
      flexDirection: 'column', width: '240px', height: '120px',
      paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px', paddingLeft: '16px',
      rowGap: '12px', columnGap: '12px', borderWidth: '2px', borderStyle: 'solid',
      borderColor: 'rgb(59, 130, 246)', background: 'rgb(15, 23, 42)',
      color: 'rgb(226, 232, 240)',
    }],
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('Timed out waiting for loaded stylesheet reflow.');
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
}
