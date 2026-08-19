import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SiteData } from '../app/types/site-data';
import { Astylar } from './astylar';
import { AstylarDiagnosticError, type AstylarDiagnostic } from './astylar-diagnostics';

describe('Astylar simultaneous surface isolation', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const observers: Array<{ disconnected: boolean }> = [];

  class TestResizeObserver {
    readonly state = { disconnected: false };

    constructor(_callback: ResizeObserverCallback) {
      observers.push(this.state);
    }

    observe(): void {}
    unobserve(): void {}
    disconnect(): void { this.state.disconnected = true; }
  }

  beforeEach(() => {
    observers.length = 0;
    globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('updates and disposes one mounted surface without mutating the other', async () => {
    const astylar = TestBed.inject(Astylar);
    const firstCanvas = document.createElement('canvas');
    const secondCanvas = document.createElement('canvas');
    document.body.append(firstCanvas, secondCanvas);
    const first = astylar.mount(firstCanvas, site('Alpha'));
    const second = astylar.mount(secondCanvas, site('Beta'));

    try {
      await Promise.all([first.whenSettled(), second.whenSettled()]);
      expect(first.scene).not.toBe(second.scene);
      expect(observers.length).toBe(2);
      expect(first.diagnostics.session?.revision).toBe(1);
      expect(second.diagnostics.session?.revision).toBe(1);
      expect(first.diagnostics.interaction?.keyboardListeners).toBe(2);
      expect(second.diagnostics.interaction?.keyboardListeners).toBe(2);

      await first.update(site('Alpha updated'));
      expect(first.diagnostics.session?.revision).toBe(2);
      expect(second.diagnostics.session?.revision).toBe(1);

      first.dispose();
      expect(first.disposed).toBeTrue();
      expect(second.disposed).toBeFalse();
      expect(observers[0].disconnected).toBeTrue();
      expect(observers[1].disconnected).toBeFalse();
      expect(first.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
      expect(first.diagnostics.interaction?.disposed).toBeTrue();

      await second.update(site('Beta still live'));
      expect(second.diagnostics.session?.revision).toBe(2);
      expect(second.diagnostics.interaction?.disposed).toBeFalse();
    } finally {
      first.dispose();
      second.dispose();
      firstCanvas.remove();
      secondCanvas.remove();
    }

    expect(observers[1].disconnected).toBeTrue();
    expect(second.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
    expect(second.diagnostics.interaction?.disposed).toBeTrue();
  });

  it('reports duplicate canvas mounts and releases the canvas after disposal', () => {
    const astylar = TestBed.inject(Astylar);
    const canvas = document.createElement('canvas');
    const reported: AstylarDiagnostic[] = [];
    document.body.append(canvas);
    const options = {
      diagnostics: {
        logLevel: 'silent' as const,
        onDiagnostic: (diagnostic: AstylarDiagnostic) => reported.push(diagnostic),
      },
    };
    const first = astylar.mount(canvas, site('First'), options);

    expect(() => astylar.mount(canvas, site('Second'), options))
      .toThrowError(AstylarDiagnosticError, /canvas-in-use/);
    expect(reported.at(-1)).toEqual(jasmine.objectContaining({
      code: 'canvas-in-use',
      severity: 'error',
    }));

    first.dispose();
    const remounted = astylar.mount(canvas, site('Remounted'), options);
    remounted.dispose();
    canvas.remove();
  });
});

function site(label: string): SiteData {
  return {
    root: {
      children: [{
        type: 'div', id: 'root', children: [
          { type: 'label', id: 'label', for: 'input', textContent: label },
          { type: 'input', id: 'input', inputType: 'text', value: label },
          { type: 'button', id: 'button', value: 'Save' },
        ],
      }],
    },
    styles: [
      { selector: '#root', display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' },
      { selector: '#input', width: '180px', padding: '8px' },
      { selector: '#button', width: '90px', padding: '8px', background: '#2563eb' },
    ],
  };
}
