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

  it('sizes the render backing store for the browser device-pixel ratio', async () => {
    spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);
    const canvas = document.createElement('canvas');
    canvas.style.width = '200px';
    canvas.style.height = '100px';
    document.body.append(canvas);
    const surface = TestBed.inject(Astylar).mount(canvas, site('DPR'));

    try {
      await surface.whenSettled();
      expect(surface.scene.getEngine().getRenderWidth()).toBe(400);
      expect(surface.scene.getEngine().getRenderHeight()).toBe(200);
    } finally {
      surface.dispose();
      canvas.remove();
    }
  });

  it('does not resize the backing store for an ordinary visual update', async () => {
    const canvas = document.createElement('canvas');
    canvas.style.width = '320px';
    canvas.style.height = '180px';
    document.body.append(canvas);
    const surface = TestBed.inject(Astylar).mount(canvas, site('Before update'));

    try {
      await surface.whenSettled();
      const resize = spyOn(surface.scene.getEngine(), 'resize').and.callThrough();

      await surface.update(site('After update'));

      expect(resize).not.toHaveBeenCalled();
      await surface.resize();
      expect(resize).toHaveBeenCalledOnceWith();
    } finally {
      surface.dispose();
      canvas.remove();
    }
  });

  it('does not present rebuilt scene resources before they are ready', async () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const surface = TestBed.inject(Astylar).mount(canvas, site('Before update'));

    try {
      await surface.whenSettled();
      let releaseReadiness!: () => void;
      const readiness = new Promise<void>((resolve) => { releaseReadiness = resolve; });
      const whenReady = spyOn(surface.scene, 'whenReadyAsync').and.returnValue(readiness);
      const autoClearStates: boolean[] = [];
      const beforeRender = surface.scene.onBeforeRenderObservable.add(() => {
        autoClearStates.push(surface.scene.autoClear);
      });
      const render = spyOn(surface.scene, 'render').and.callThrough();

      const update = surface.update(site('After update'));
      await waitUntil(() => whenReady.calls.count() > 0);

      expect(whenReady).toHaveBeenCalledOnceWith();
      const suspendedRenderCount = render.calls.count();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(render.calls.count()).toBe(suspendedRenderCount);

      releaseReadiness();
      await update;
      expect(render.calls.count() - suspendedRenderCount).toBe(2);
      expect(autoClearStates.slice(-2)).toEqual([false, true]);
      surface.scene.onBeforeRenderObservable.remove(beforeRender);
    } finally {
      surface.dispose();
      canvas.remove();
    }
  });

  it('settles initial rendering after fonts are ready and reflows for later font loads', async () => {
    let releaseFonts!: () => void;
    const fontsReady = new Promise<FontFaceSet>((resolve) => {
      releaseFonts = () => resolve(fonts);
    });
    let loadingDone: EventListener | undefined;
    const fonts = {
      ready: fontsReady,
      addEventListener: jasmine.createSpy('addFontListener').and.callFake(
        (type: string, listener: EventListenerOrEventListenerObject) => {
          if (type === 'loadingdone' && typeof listener === 'function') loadingDone = listener;
        },
      ),
      removeEventListener: jasmine.createSpy('removeFontListener'),
    } as unknown as FontFaceSet;
    spyOnProperty(document, 'fonts', 'get').and.returnValue(fonts);

    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const surface = TestBed.inject(Astylar).mount(canvas, site('Web font'));

    try {
      let initialSettled = false;
      const initial = surface.whenSettled().then((snapshot) => {
        initialSettled = true;
        return snapshot;
      });
      await waitUntil(() => surface.diagnostics.session?.status === 'rendering');
      await new Promise((resolve) => setTimeout(resolve, 25));

      expect(initialSettled).toBeFalse();
      expect(surface.diagnostics.session?.revision).toBe(0);

      releaseFonts();
      await initial;
      expect(surface.diagnostics.session?.revision).toBe(1);
      expect(fonts.addEventListener).toHaveBeenCalledWith('loadingdone', jasmine.any(Function));

      loadingDone?.(new Event('loadingdone'));
      await waitUntil(() => surface.diagnostics.session?.revision === 2);
      expect(surface.diagnostics.session?.revision).toBe(2);
    } finally {
      surface.dispose();
      canvas.remove();
    }

    expect(fonts.removeEventListener).toHaveBeenCalledWith(
      'loadingdone',
      jasmine.any(Function),
    );
  });

  it('treats a class-authored focus color as the control focus indicator', async () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const astylar = TestBed.inject(Astylar);
    const surface = astylar.mount(canvas, {
      root: {
        children: [{
          type: 'button', id: 'play', class: 'transport-play', value: 'Play',
        }],
      },
      styles: [
        { selector: '.transport-play', color: '#e6edf3' },
        { selector: '.transport-play:focus', color: '#58a6ff' },
      ],
    });

    try {
      await surface.whenSettled();
      const semanticButton = document.querySelector<HTMLElement>(
        '[data-astylar-id="play"]',
      );
      expect(semanticButton).not.toBeNull();
      semanticButton?.focus();
      await Promise.resolve();
      expect(surface.scene.meshes.some((mesh) =>
        mesh.name.startsWith('focusIndicator_play_'))).toBeFalse();
      await surface.update({
        root: {
          children: [{
            type: 'button', id: 'play', class: 'transport-play playing', value: 'Pause',
          }],
        },
        styles: [
          { selector: '.transport-play', color: '#e6edf3' },
          { selector: '.transport-play:focus, .transport-play.playing', color: '#58a6ff' },
        ],
      });
      expect(surface.scene.meshes.some((mesh) =>
        mesh.name.startsWith('focusIndicator_play_') && mesh.isVisible)).toBeFalse();
    } finally {
      surface.dispose();
      canvas.remove();
    }
  });

  it('suppresses the fallback ring for an authored transparent focus shadow', async () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const surface = TestBed.inject(Astylar).mount(canvas, {
      root: {
        children: [{ type: 'button', id: 'quiet-focus', value: 'Open menu' }],
      },
      styles: [
        { selector: '#quiet-focus', width: '120px', height: '40px' },
        { selector: '#quiet-focus:focus', boxShadow: '0 0 0 1px rgba(0,0,0,0)' },
      ],
    });

    try {
      await surface.whenSettled();
      document.querySelector<HTMLElement>('[data-astylar-id="quiet-focus"]')?.focus();
      await Promise.resolve();
      const visibleIndicators = surface.scene.meshes
        .filter((mesh) => mesh.name.startsWith('focusIndicator_quiet-focus_') && mesh.isVisible)
        .map((mesh) => ({
          name: mesh.name,
          alpha: (mesh.material as { alpha?: number } | null)?.alpha,
          kind: mesh.metadata?.focusIndicatorKind,
        }));
      expect(visibleIndicators).withContext(JSON.stringify(visibleIndicators)).toEqual([]);
    } finally {
      surface.dispose();
      canvas.remove();
    }
  });
});

async function waitUntil(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!predicate() && performance.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

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
