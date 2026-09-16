import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Tests one proposed mechanism behind the original field-host measurements.
// Both sides receive identical rules; this does not endorse the candidate's
// fixed-height/absolute composition as equivalent to Angular Material.
describe('Material audit: field host fixed-parent shrink mechanism', () => {
  for (const [profile, parentHeight, hostHeight] of [['normal', 134, 78], ['contrast', 114, 62], ['compact', 126, 70]] as const) {
    for (const extraRoom of [0, 40]) for (const shrink of ['0', '1'] as const) {
      it(`${profile}/extra-${extraRoom}/shrink-${shrink}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const frame = document.createElement('iframe');
        frame.style.cssText = 'width:400px;height:280px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:400px;height:280px;display:block';
        document.body.append(frame, canvas);
        const doc = frame.contentDocument!, css = doc.createElement('style');
        doc.head.append(css);
        doc.body.innerHTML = '<section id="shrink-parent"><div id="shrink-host"><div id="shrink-absolute-child"></div></div></section>';
        const site: SiteData = {
          root: { children: [{ type: 'section', id: 'shrink-parent', children: [{ type: 'div', id: 'shrink-host',
            children: [{ type: 'div', id: 'shrink-absolute-child' }] }] }] },
          styles: [
            { selector: 'body', margin: '0', padding: '0' },
            { selector: '#shrink-parent', position: 'absolute', left: '32px', top: '32px', width: '300px',
              height: `${parentHeight + extraRoom}px`, boxSizing: 'border-box', margin: '0', padding: '28px',
              borderWidth: '1px', borderStyle: 'solid', borderColor: '#123456', borderRadius: '0',
              display: 'flex', flexDirection: 'column', gap: '16px', background: '#eeeeee' },
            { selector: '#shrink-host', position: 'relative', display: 'block', width: '100%', height: `${hostHeight}px`,
              boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', alignSelf: 'flex-start',
              flexGrow: '0', flexShrink: shrink, flexBasis: 'auto', background: '#ddccff' },
            { selector: '#shrink-absolute-child', position: 'absolute', top: '0', left: '0', width: '100%', height: '24px',
              boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', background: '#6750a4' },
          ],
        };
        css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
          .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        const original = JSON.stringify(site), originalCss = css.textContent;
        const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        try {
          await doc.fonts.ready; await surface.whenSettled();
          expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
          const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const interior = parentHeight + extraRoom - 58;
          const expectedHostHeight = shrink === '1' ? Math.min(hostHeight, interior) : hostHeight;
          const expected = {
            'shrink-parent': { x: 32, y: 32, width: 300, height: parentHeight + extraRoom },
            'shrink-host': { x: 61, y: 61, width: 242, height: expectedHostHeight },
            'shrink-absolute-child': { x: 61, y: 61, width: 242, height: 24 },
          };
          const measurements = Object.entries(expected).map(([id, box]) => {
            const element = doc.getElementById(id)!, rect = element.getBoundingClientRect();
            const computed = doc.defaultView!.getComputedStyle(element);
            const mesh = surface.scene.getMeshByName(id)!;
            expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
            // Observation only: projected mesh output is never fed into input
            // layout or authored corrections.
            const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
              Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
            const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
            const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
            return { id, expected: box, reference: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              actual: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
              browserStyle: { display: computed.display, height: computed.height, flexShrink: computed.flexShrink,
                position: computed.position, boxSizing: computed.boxSizing } };
          });
          const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === 'shrink-host')!;
          const stages = [inspected.normal, inspected.effective].map(s => ({ height: s.height, flexShrink: s.flexShrink,
            flexBasis: s.flexBasis, boxSizing: s.boxSizing, position: s.position }));
          console.info('MATERIAL_FIELD_HOST_SHRINK_PROOF', JSON.stringify({ profile, parentHeight, hostHeight, extraRoom, shrink,
            dpr: devicePixelRatio, userAgent: navigator.userAgent, site, css: css.textContent, stages, measurements,
            renderSize: [engine.getRenderWidth(), engine.getRenderHeight()],
            scope: 'Identical fixed-height flex parent and block host with an absolute child; shrink mechanism only, not Material input or raster equivalence.' }));
          for (const m of measurements) for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(Math.abs(m.reference[key] - m.expected[key])).withContext(`reference ${m.id}/${key}`).toBeLessThan(.01);
            expect(Math.abs(m.actual[key] - m.reference[key])).withContext(`candidate ${m.id}/${key}`).toBeLessThan(.5);
          }
          for (const stage of stages) {
            expect(stage.height).toBe(`${hostHeight}px`); expect(stage.flexShrink).toBe(shrink);
            expect(stage.flexBasis).toBe('auto'); expect(stage.boxSizing).toBe('border-box');
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
