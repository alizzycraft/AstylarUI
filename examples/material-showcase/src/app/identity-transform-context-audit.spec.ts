import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Diagnostic variants only. Both trees and declarations are generated from
// one public SiteData input. No measured browser position feeds the candidate.
describe('Material audit: identity transform context semantics', () => {
  for (const mode of ['fixed-child', 'stacking'] as const) {
    for (const transform of [undefined, 'none', 'translateZ(0px)', 'matrix(1,0,0,1,0,0)', 'translate(0px)', 'scale(1)', 'rotate(0deg)']) {
      it(`${mode} / ${transform ?? '<omitted>'}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const frame = document.createElement('iframe');
        frame.style.cssText = 'width:320px;height:200px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:320px;height:200px;display:block';
        document.body.append(frame, canvas);
        const doc = frame.contentDocument!;
        doc.body.style.margin = '0';
        const site: SiteData = { root: { children: [
          { type: 'div', id: 'context-host', children: [{ type: 'div', id: 'context-child' }] },
          ...(mode === 'stacking' ? [{ type: 'div', id: 'context-sibling' }] : []),
        ] }, styles: [
          { selector: '*', display: 'block', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', boxSizing: 'border-box' },
          { selector: '#context-host', position: 'absolute', left: '80px', top: '60px', width: '100px', height: '100px', background: '#777777',
            ...(transform === undefined ? {} : { transform }) },
          { selector: '#context-child', position: mode === 'fixed-child' ? 'fixed' : 'absolute',
            left: mode === 'fixed-child' ? '5px' : '0px', top: mode === 'fixed-child' ? '7px' : '0px',
            width: mode === 'fixed-child' ? '10px' : '100px', height: mode === 'fixed-child' ? '10px' : '100px',
            background: '#ff0000', zIndex: '100' },
          { selector: '#context-sibling', position: 'absolute', left: '80px', top: '60px', width: '100px', height: '100px', background: '#0000ff', zIndex: '1' },
        ] };
        const css = doc.createElement('style');
        css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
          .map(([name, value]) => `${name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        doc.head.append(css);
        const append = (nodes: NonNullable<SiteData['root']['children']>, parent: HTMLElement) => {
          for (const node of nodes) {
            const element = doc.createElement(node.type); element.id = node.id!; parent.append(element);
            if (node.children) append(node.children, element);
          }
        };
        append(site.root.children!, doc.body);
        const original = JSON.stringify(site), originalCss = css.textContent;
        let surface: ReturnType<Astylar['mount']> | undefined;
        try {
          await doc.fonts.ready;
          surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
          await surface.whenSettled();
          const diagnostics = surface.diagnostics.messages;
          expect(diagnostics.filter(m => m.severity === 'error')).toEqual([]);
          const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === 'context-host')!;
          expect(inspected.normal.transform).toBe(transform);
          expect(inspected.effective.transform).toBe(transform);
          const engine = surface.scene.getEngine();
          const viewport = surface.scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const observations: Record<string, { actual: { left: number; top: number; width: number; height: number }; reference: { left: number; top: number; width: number; height: number } }> = {};
          for (const id of ['context-host', 'context-child']) {
            const mesh = surface.scene.getMeshByName(id)!;
            expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
            // Final rendered output measurement, not layout logic or mutation.
            const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p =>
              Vector3.Project(p, Matrix.IdentityReadOnly, surface!.scene.getTransformMatrix(), viewport));
            const sx = canvas.clientWidth / engine.getRenderWidth(), sy = canvas.clientHeight / engine.getRenderHeight();
            const left = Math.min(...points.map(p => p.x)) * sx, top = Math.min(...points.map(p => p.y)) * sy;
            const actual = { left, top, width: Math.max(...points.map(p => p.x)) * sx - left,
              height: Math.max(...points.map(p => p.y)) * sy - top };
            const rect = doc.getElementById(id)!.getBoundingClientRect();
            observations[id] = { actual, reference: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
          }
          let stack: { referenceHit: string; actualPixel: number[]; expectedColor: string } | undefined;
          if (mode === 'stacking') {
            const referenceHit = doc.elementFromPoint(100, 80)!.id;
            const expectedColor = doc.defaultView!.getComputedStyle(doc.getElementById(referenceHit)!).backgroundColor;
            surface.scene.render();
            const buffer = await engine.readPixels(Math.floor(100 * engine.getRenderWidth() / canvas.clientWidth),
              engine.getRenderHeight() - 1 - Math.floor(80 * engine.getRenderHeight() / canvas.clientHeight), 1, 1);
            stack = { referenceHit, expectedColor, actualPixel: [...new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)] };
          }
          console.info('MATERIAL_IDENTITY_CONTEXT_PROOF', JSON.stringify({ mode, transform: transform ?? '<omitted>',
            dpr: devicePixelRatio, viewport: [canvas.clientWidth, canvas.clientHeight],
            renderSize: [engine.getRenderWidth(), engine.getRenderHeight()], diagnostics,
            referenceTransform: doc.defaultView!.getComputedStyle(doc.getElementById('context-host')!).transform,
            candidateNormal: inspected.normal.transform ?? '<omitted>', candidateEffective: inspected.effective.transform ?? '<omitted>',
            observations, stack }));
          for (const [id, observed] of Object.entries(observations)) for (const axis of ['left', 'top', 'width', 'height'] as const)
            expect(Math.abs(observed.actual[axis] - observed.reference[axis])).withContext(`${id}.${axis}`).toBeLessThan(.5);
          if (stack) {
            const expectedId = transform === undefined || transform === 'none' ? 'context-child' : 'context-sibling';
            expect(stack.referenceHit).toBe(expectedId);
            const expected = expectedId === 'context-child' ? [255, 0, 0] : [0, 0, 255];
            expected.forEach((channel, index) => expect(Math.abs(stack!.actualPixel[index] - channel)).withContext(`stack pixel channel ${index}`).toBeLessThan(3));
          }
          expect(JSON.stringify(site)).toBe(original); expect(css.textContent).toBe(originalCss);
        } finally {
          surface?.dispose();
          if (surface) {
            expect(surface.scene.meshes.length).toBe(0); expect(surface.scene.materials.length).toBe(0); expect(surface.scene.textures.length).toBe(0);
          }
          frame.remove(); canvas.remove(); TestBed.resetTestingModule();
        }
      }, 30000);
    }
  }
});
