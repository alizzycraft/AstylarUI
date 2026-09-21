import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Isolated reduction, not a replacement Material fixture. A fixed-height empty
// content child isolates automatic border-box contribution from text metrics.
describe('Material audit: sort focus bottom border in normal flow', () => {
  for (const width of [120, 240]) {
    it(`${width}px border grow and restore`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:400px;height:200px;border:0';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:400px;height:200px;display:block';
      document.body.append(frame, canvas);
      const doc = frame.contentDocument!, sheet = doc.createElement('style'); doc.head.append(sheet);
      doc.body.innerHTML = '<div id="host"><div id="focus-owner"><div id="content"></div></div><div id="following"></div></div>';
      const build = (border: number): SiteData => ({
        root: { children: [{ type: 'div', id: 'host', children: [
          { type: 'div', id: 'focus-owner', children: [{ type: 'div', id: 'content' }] },
          { type: 'div', id: 'following' },
        ] }] },
        styles: [
          { selector: 'body', margin: '0', padding: '0', background: '#ffffff' },
          { selector: 'div', display: 'block', margin: '0', padding: '0', borderWidth: '0', boxSizing: 'content-box' },
          { selector: '#host', width: `${width}px`, background: '#ffffff' },
          { selector: '#focus-owner', position: 'relative', display: 'flex', alignItems: 'center',
            borderWidth: `0 0 ${border}px 0`, borderStyle: 'solid', borderColor: '#123456', background: '#eeeeee' },
          { selector: '#content', width: '64px', height: '19px', background: '#eeeeee' },
          { selector: '#following', height: '8px', background: '#6750a4' },
        ],
      });
      const css = (site: SiteData) => site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
        .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      const initial = build(0);
      const surface = TestBed.inject(Astylar).mount(canvas, initial, { diagnostics: { logLevel: 'silent' } });
      try {
        for (const [step, border] of [['initial', 0], ['border', 1], ['restored', 0]] as const) {
          const site = step === 'initial' ? initial : build(border), authored = JSON.stringify(site);
          sheet.textContent = css(site);
          if (step !== 'initial') await surface.update(site);
          await surface.whenSettled();
          expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
          const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const measurements = ['host', 'focus-owner', 'content', 'following'].map(id => {
            const rect = doc.getElementById(id)!.getBoundingClientRect();
            const mesh = surface.scene.getMeshByName(id)!; expect(mesh).not.toBeNull();
            mesh.computeWorldMatrix(true);
            // Read-only projection back to screen pixels for measurement only.
            const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
              Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
            const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
            const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
            return { id, reference: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              actual: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } };
          });
          console.info('MATERIAL_SORT_FOCUS_BORDER_AUDIT', JSON.stringify({ width, step, border, site,
            css: sheet.textContent, measurements, styles: surface.inspectResolvedStyles(),
            browser: navigator.userAgent, dpr: devicePixelRatio, viewport: [400, 200],
            scope: 'Equal-input bottom-border flow and update geometry; not text, real focus gestures, border raster or complete Material equivalence.' }));
          expect(measurements[1].reference.height).toBe(19 + border);
          expect(measurements[3].reference.y).toBe(19 + border);
          for (const m of measurements) for (const key of ['x', 'y', 'width', 'height'] as const)
            expect(Math.abs(m.actual[key] - m.reference[key])).withContext(`${width}/${step}/${m.id}/${key}`).toBeLessThan(.5);
          expect(JSON.stringify(site)).toBe(authored);
        }
      } finally {
        surface.dispose();
        expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
        frame.remove(); canvas.remove(); TestBed.resetTestingModule();
      }
    }, 30000);
  }
});
