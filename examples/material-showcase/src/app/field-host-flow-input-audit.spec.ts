import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Separate diagnostic: restores the reference's in-flow column and automatic
// host/section heights. Both surfaces use the same authored rules and updates.
// Empty fixed-height wrapper boxes isolate layout from descendant typography.
describe('Material audit: automatic field-host height from in-flow wrappers', () => {
  for (const display of ['flex', 'inline-flex'] as const) for (const width of [120, 240]) {
    it(`${display}/${width}px/grow-and-restore`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const frame = document.createElement('iframe'); frame.style.cssText = 'width:480px;height:400px;border:0';
      const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:480px;height:400px;display:block';
      document.body.append(frame, canvas);
      const doc = frame.contentDocument!, css = doc.createElement('style'); doc.head.append(css);
      doc.body.innerHTML = '<main id="flow-frame"><section id="flow-section"><div id="flow-host"><div id="flow-field"></div><div id="flow-subscript"></div></div></section><div id="flow-following"></div></main>';
      const build = (subscriptHeight: number): SiteData => ({
        root: { children: [{ type: 'main', id: 'flow-frame', children: [
          { type: 'section', id: 'flow-section', children: [{ type: 'div', id: 'flow-host', children: [
            { type: 'div', id: 'flow-field' }, { type: 'div', id: 'flow-subscript' },
          ] }] }, { type: 'div', id: 'flow-following' },
        ] }] },
        styles: [
          { selector: 'body', margin: '0', padding: '0' },
          { selector: '#flow-frame', position: 'absolute', top: '16px', left: '16px', width: '400px', height: '340px',
            margin: '0', padding: '0', borderWidth: '0', display: 'block', boxSizing: 'border-box', background: '#ffffff' },
          { selector: '#flow-section', display: 'block', width: `${width}px`, margin: '0', padding: '28px',
            borderWidth: '1px', borderStyle: 'solid', borderColor: '#123456', boxSizing: 'content-box',
            fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', background: '#eeeeee' },
          { selector: '#flow-host', display, flexDirection: 'column', minWidth: '0', width: '100%',
            margin: '0', padding: '0', borderWidth: '0', boxSizing: 'content-box',
            fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', background: '#ddccff' },
          { selector: '#flow-field', position: 'relative', display: 'flex', height: '56px', margin: '0', padding: '0', borderWidth: '0', background: '#6750a4' },
          { selector: '#flow-subscript', position: 'relative', display: 'block', height: `${subscriptHeight}px`, margin: '0', padding: '0', borderWidth: '0', background: '#999999' },
          { selector: '#flow-following', display: 'block', width: '100%', height: '8px', margin: '0', padding: '0', borderWidth: '0', background: '#111111' },
        ],
      });
      const toCss = (site: SiteData) => site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
        .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      const first = build(20); css.textContent = toCss(first);
      const surface = TestBed.inject(Astylar).mount(canvas, first, { diagnostics: { logLevel: 'silent' } });
      try {
        for (const [step, subscriptHeight] of [['initial', 20], ['grown', 40], ['restored', 20]] as const) {
          const site = step === 'initial' ? first : build(subscriptHeight), original = JSON.stringify(site);
          css.textContent = toCss(site);
          if (step !== 'initial') await surface.update(site);
          await doc.fonts.ready; await surface.whenSettled();
          expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
          const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
          const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const inspection = surface.inspectResolvedStyles();
          const measurements = ['flow-frame', 'flow-section', 'flow-host', 'flow-field', 'flow-subscript', 'flow-following'].map(id => {
            const element = doc.getElementById(id)!, rect = element.getBoundingClientRect();
            const computed = doc.defaultView!.getComputedStyle(element), mesh = surface.scene.getMeshByName(id)!;
            expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
            const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
              Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
            const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
            const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
            const local = inspection.elements.find(e => e.id === id)!;
            return { id, reference: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              actual: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
              browserStyle: { display: computed.display, height: computed.height, width: computed.width,
                flexDirection: computed.flexDirection, position: computed.position, boxSizing: computed.boxSizing, verticalAlign: computed.verticalAlign },
              stages: [local.normal, local.effective].map(s => ({ display: s.display, height: s.height ?? '<omitted>',
                width: s.width ?? '<omitted>', flexDirection: s.flexDirection, boxSizing: s.boxSizing ?? '<omitted>' })) };
          });
          console.info('MATERIAL_FIELD_HOST_FLOW_PROOF', JSON.stringify({ display, width, step, subscriptHeight,
            dpr: devicePixelRatio, userAgent: navigator.userAgent, site, css: css.textContent, measurements,
            renderSize: [engine.getRenderWidth(), engine.getRenderHeight()],
            scope: 'Equal-input auto-height column host and block section with two empty in-flow wrappers and a following sibling; geometry/update proof, not Material controls, typography or raster equivalence.' }));
          const host = measurements.find(m => m.id === 'flow-host')!, section = measurements.find(m => m.id === 'flow-section')!;
          expect(host.reference.height).toBe(56 + subscriptHeight); expect(host.reference.width).toBe(width);
          expect(section.reference.width).toBe(width + 58);
          if (display === 'flex') expect(section.reference.height).toBe(56 + subscriptHeight + 58);
          for (const m of measurements) for (const key of ['x', 'y', 'width', 'height'] as const)
            expect(Math.abs(m.actual[key] - m.reference[key])).withContext(`${display}/${width}/${step}/${m.id}/${key}`).toBeLessThan(.5);
          expect(JSON.stringify(site)).toBe(original); expect(css.textContent).toBe(toCss(site));
        }
      } finally {
        surface.dispose();
        expect(surface.scene.meshes.length).toBe(0); expect(surface.scene.materials.length).toBe(0); expect(surface.scene.textures.length).toBe(0);
        frame.remove(); canvas.remove(); TestBed.resetTestingModule();
      }
    }, 30000);
  }
});
