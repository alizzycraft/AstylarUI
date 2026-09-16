import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Diagnostic variants only: one authored rule source feeds both native button
// implementations. No candidate-only size/spacing correction or Material edit.
describe('Material audit: native button box-sizing observation and used border box', () => {
  for (const width of [120, 240]) {
    for (const mode of ['omitted', 'border-box', 'content-box'] as const) {
      it(`${width}px/${mode}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const frame = document.createElement('iframe');
        frame.style.cssText = 'width:400px;height:180px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:400px;height:180px;display:block';
        document.body.append(frame, canvas);
        const doc = frame.contentDocument!;
        const css = doc.createElement('style'); doc.head.append(css);
        const button = doc.createElement('button');
        button.id = 'button-box-sizing-probe'; button.type = 'button'; button.textContent = 'Probe';
        doc.body.append(button);
        const site: SiteData = {
          root: { children: [{ type: 'button', id: button.id, value: button.textContent }] },
          styles: [
            { selector: 'body', margin: '0', padding: '0' },
            { selector: '#button-box-sizing-probe', position: 'absolute', display: 'block',
              left: '32px', top: '32px', width: `${width}px`, height: '44px',
              margin: '0', padding: '6px 14px', borderWidth: '2px', borderStyle: 'solid',
              borderColor: '#123456', borderRadius: '0px', appearance: 'none',
              fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px', fontWeight: '400',
              color: '#123456', background: '#eeeeee',
              ...(mode === 'omitted' ? {} : { boxSizing: mode }),
            },
          ],
        };
        css.textContent = site.styles.map(({ selector, ...values }) =>
          `${selector}{${Object.entries(values).map(([key, value]) =>
            `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        const originalSite = JSON.stringify(site), originalCss = css.textContent;
        const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        try {
          await doc.fonts.ready; await surface.whenSettled();
          expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
          const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === button.id)!;
          expect(inspected).toBeDefined();
          const stages = [inspected.normal, inspected.effective].map(style => ({
            width: style.width, height: style.height, padding: style.padding,
            borderWidth: style.borderWidth, boxSizing: style.boxSizing ?? '<omitted>',
          }));
          const computed = doc.defaultView!.getComputedStyle(button), bounds = button.getBoundingClientRect();
          const mesh = surface.scene.getMeshByName(button.id)!;
          expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
          const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          // Output measurement only: world geometry is projected back into CSS
          // pixels for comparison and never fed into authoring or layout.
          const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
            Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
          const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
          const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
          const actual = { x: Math.min(...xs), y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
          const reference = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
          const expected = { x: 32, y: 32, width: width + (mode === 'content-box' ? 32 : 0),
            height: 44 + (mode === 'content-box' ? 16 : 0) };
          const browserStyle = { boxSizing: computed.boxSizing, width: computed.width, height: computed.height,
            padding: computed.padding, borderWidth: computed.borderWidth };
          console.info('MATERIAL_BUTTON_BOX_SIZING_PROOF', JSON.stringify({ mode, width,
            dpr: devicePixelRatio, userAgent: navigator.userAgent, site, css: css.textContent,
            stages, browserStyle, reference, actual, expected,
            renderSize: [engine.getRenderWidth(), engine.getRenderHeight()],
            scope: 'Native button declared pixel sizes with nonzero padding/border; not auto/intrinsic sizing, label composition, clipping, hit testing or raster equivalence.' }));
          expect(computed.boxSizing).toBe(mode === 'content-box' ? 'content-box' : 'border-box');
          for (const stage of stages) {
            expect(stage.width).toBe(`${width}px`); expect(stage.height).toBe('44px');
            expect(stage.boxSizing).toBe(mode === 'omitted' ? '<omitted>' : mode);
          }
          for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(Math.abs(reference[key] - expected[key])).withContext(`reference ${key}`).toBeLessThan(.01);
            expect(Math.abs(actual[key] - reference[key])).withContext(`candidate ${key}`).toBeLessThan(.5);
          }
          expect(JSON.stringify(site)).toBe(originalSite); expect(css.textContent).toBe(originalCss);
        } finally {
          surface.dispose();
          expect(surface.scene.meshes.length).toBe(0);
          expect(surface.scene.materials.length).toBe(0);
          expect(surface.scene.textures.length).toBe(0);
          frame.remove(); canvas.remove(); TestBed.resetTestingModule();
        }
      }, 30000);
    }
  }
});
