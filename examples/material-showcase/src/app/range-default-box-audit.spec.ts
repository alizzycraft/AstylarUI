import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Isolated same-input diagnostics. These variants do not change Material fixtures.
// Equality assertions intentionally retain exposed failures, not expected defects.
describe('Material audit: range defaults versus explicit shared borders', () => {
  for (const boxSizing of ['content-box', 'border-box'] as const) {
    for (const mode of ['omitted', 'zero', 'two'] as const) {
      it(`${boxSizing}/${mode}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const frame = document.createElement('iframe');
        frame.style.cssText = 'width:320px;height:180px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:320px;height:180px;display:block';
        document.body.append(frame, canvas);
        const doc = frame.contentDocument!;
        const css = doc.createElement('style'); doc.head.append(css);
        const input = doc.createElement('input');
        input.id = 'range-box-probe'; input.type = 'range';
        input.min = '0'; input.max = '100'; input.step = '5'; input.value = '50';
        doc.body.append(input);
        const site: SiteData = {
          root: { children: [{ type: 'input', inputType: 'range', id: input.id,
            min: input.min, max: input.max, step: input.step, value: input.value }] },
          styles: [
            { selector: 'body', margin: '0', padding: '0' },
            { selector: '#range-box-probe', position: 'absolute', display: 'block',
              left: '32px', top: '32px', width: '120px', height: '44px',
              boxSizing, margin: '0', padding: '0', fontFamily: 'Arial', fontSize: '16px',
              ...(mode === 'omitted' ? {} : {
                borderWidth: mode === 'zero' ? '0px' : '2px',
                borderStyle: mode === 'zero' ? 'none' : 'solid',
                borderColor: '#123456', borderRadius: '0px',
              }),
            },
          ],
        };
        // One rule source for both engines; no candidate-only border reset.
        css.textContent = site.styles.map(({ selector, ...values }) =>
          `${selector}{${Object.entries(values).map(([key, value]) =>
            `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        const original = JSON.stringify(site), originalCss = css.textContent;
        const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        try {
          await doc.fonts.ready; await surface.whenSettled();
          expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
          const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === input.id)!;
          expect(inspected).toBeDefined();
          const computed = doc.defaultView!.getComputedStyle(input);
          const bounds = input.getBoundingClientRect();
          const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const mesh = surface.scene.getMeshByName(input.id)!;
          expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
          // Final-output measurement only. Projected values never feed authored/layout input.
          const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p =>
            Vector3.Project(p, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
          const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
          const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
          const actual = { x: Math.min(...xs), y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
          const reference = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
          const browserStyle = { borderWidth: computed.borderTopWidth, borderStyle: computed.borderTopStyle,
            borderRadius: computed.borderTopLeftRadius, boxSizing: computed.boxSizing, appearance: computed.appearance };
          const stages = [inspected.normal, inspected.effective].map(style => ({
            borderWidth: style.borderWidth, borderStyle: style.borderStyle, borderRadius: style.borderRadius,
            boxSizing: style.boxSizing, appearance: style.appearance ?? '<omitted>',
          }));
          console.info('MATERIAL_RANGE_DEFAULT_BOX_PROOF', JSON.stringify({ mode, boxSizing,
            dpr: devicePixelRatio, userAgent: navigator.userAgent, site, css: css.textContent,
            browserStyle, stages, reference, actual,
            renderSize: [engine.getRenderWidth(), engine.getRenderHeight()] }));
          for (const stage of stages) {
            for (const property of ['borderWidth', 'borderStyle', 'borderRadius', 'boxSizing'] as const) {
              expect(stage[property]).withContext(property).toBe(browserStyle[property]);
            }
          }
          for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(Math.abs(actual[key] - reference[key])).withContext(key).toBeLessThan(.5);
          }
          expect(JSON.stringify(site)).toBe(original); expect(css.textContent).toBe(originalCss);
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
