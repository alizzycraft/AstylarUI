import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Isolated audit reduction, not a Material fixture correction. The same rules
// feed both renderers, including deliberately omitted box-sizing.
describe('Material audit: table versus block box-sizing defaults', () => {
  for (const type of ['table', 'div'] as const) {
    for (const mode of ['omitted', 'border-box', 'content-box'] as const) {
      it(`${type}/${mode} preserves native used bounds`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const frame = document.createElement('iframe');
        frame.style.cssText = 'width:400px;height:180px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:400px;height:180px;display:block';
        document.body.append(frame, canvas);
        const doc = frame.contentDocument!;
        const probe = doc.createElement(type); probe.id = 'box-probe';
        const children = type === 'table'
          ? [{ type: 'tbody', id: 'section', children: [{ type: 'tr', id: 'row',
              children: [{ type: 'td', id: 'cell', textContent: 'X' }] }] }]
          : [];
        if (type === 'table') {
          const section = doc.createElement('tbody'), row = doc.createElement('tr'), cell = doc.createElement('td');
          section.id = 'section'; row.id = 'row'; cell.id = 'cell'; cell.textContent = 'X';
          row.append(cell); section.append(row); probe.append(section);
        }
        doc.body.append(probe);
        const site: SiteData = { root: { children: [{ type, id: probe.id, children }] }, styles: [
          { selector: 'body', margin: '0', padding: '0' },
          { selector: '#box-probe', position: 'absolute', left: '32px', top: '32px',
            display: type === 'table' ? 'table' : 'block', width: '120px', height: '44px',
            margin: '0', padding: '6px 14px', borderWidth: '2px', borderStyle: 'solid',
            borderColor: '#123456', background: '#eeeeee',
            ...(mode === 'omitted' ? {} : { boxSizing: mode }) },
          { selector: 'td', padding: '0', borderWidth: '0', fontFamily: 'Arial',
            fontSize: '12px', lineHeight: '14px', fontWeight: '400' },
        ] };
        const css = doc.createElement('style');
        css.textContent = site.styles.map(({ selector, ...values }) =>
          `${selector}{${Object.entries(values).map(([key, value]) =>
            `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        doc.head.append(css);
        const original = JSON.stringify(site);
        const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        try {
          await doc.fonts.ready; await surface.whenSettled();
          expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
          const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === probe.id)!;
          expect(inspected).toBeDefined();
          const mesh = surface.scene.getMeshByName(probe.id)!;
          expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
          const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          // Measurement only; projected output never influences authored inputs.
          const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
            Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
          const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
          const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
          const actual = { x: Math.min(...xs), y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
          const bounds = probe.getBoundingClientRect(), computed = doc.defaultView!.getComputedStyle(probe);
          const reference = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
          console.info('MATERIAL_TABLE_BLOCK_BOX_PROOF', JSON.stringify({ type, mode,
            dpr: devicePixelRatio, userAgent: navigator.userAgent, site, css: css.textContent,
            stages: [inspected.normal, inspected.effective], browserBoxSizing: computed.boxSizing,
            reference, actual, scope: 'Declared pixel border boxes only; no raster or Material equivalence claim.' }));
          expect(computed.boxSizing).toBe(mode === 'omitted' ? (type === 'table' ? 'border-box' : 'content-box') : mode);
          for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(Math.abs(actual[key] - reference[key])).withContext(`${type}/${mode} ${key}`).toBeLessThan(.5);
          }
          expect(JSON.stringify(site)).toBe(original);
        } finally {
          surface.dispose(); frame.remove(); canvas.remove(); TestBed.resetTestingModule();
        }
      }, 30000);
    }
  }
});
