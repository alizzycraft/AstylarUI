import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Public-package diagnostic variants, not edits to Material comparisons.
// Cross-engine assertions cover declarations and geometry. Raster assertions
// compare appearance variants within Astylar, not browser screenshot parity.
describe('Material audit: appearance ownership and control sensitivity', () => {
  for (const type of ['div', 'section', 'span', 'p', 'h2', 'a', 'select', 'checkbox']) {
    it(`${type}: omitted, auto and none`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const frame = document.createElement('iframe'); frame.style.cssText = 'width:320px;height:180px;border:0';
      const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:320px;height:180px;display:block';
      document.body.append(frame, canvas);
      const doc = frame.contentDocument!; doc.body.style.margin = '0';
      const css = doc.createElement('style'); doc.head.append(css);
      const tag = type === 'checkbox' ? 'input' : type;
      const node = doc.createElement(tag); node.id = 'appearance-probe';
      if (type === 'checkbox') { (node as HTMLInputElement).type = 'checkbox'; (node as HTMLInputElement).checked = true; }
      if (type === 'select') { const option = doc.createElement('option'); option.value = 'one'; option.text = 'One'; node.append(option); }
      doc.body.append(node);
      let baseline: Uint8Array | undefined;
      const observations: unknown[] = [];
      try {
        for (const appearance of [undefined, 'auto', 'none'] as const) {
          const site: SiteData = { root: { children: [{ type: tag, id: 'appearance-probe',
            ...(type === 'checkbox' ? { inputType: 'checkbox', checked: true } : {}),
            ...(type === 'select' ? { value: 'one', options: [{ value: 'one', label: 'One' }] } : {}),
          }] }, styles: [
            { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none' },
            { selector: '#appearance-probe', display: 'block', position: 'absolute', left: '32px', top: '32px',
              width: '120px', height: '48px', background: '#238b45', color: '#ffffff',
              fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '24px',
              ...(appearance === undefined ? {} : { appearance }),
            },
          ] };
          css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
            .map(([name, value]) => `${name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
          const original = JSON.stringify(site), originalCss = css.textContent;
          const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
          try {
            await doc.fonts.ready; await surface.whenSettled();
            expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
            const inspection = surface.inspectResolvedStyles().elements.find(e => e.id === 'appearance-probe')!;
            for (const stage of [inspection.normal, inspection.effective]) expect(stage.appearance).toBe(appearance);
            const computed = doc.defaultView!.getComputedStyle(node);
            const expectedAppearance = appearance ?? (['select', 'checkbox'].includes(type) ? 'auto' : 'none');
            expect(computed.appearance).toBe(expectedAppearance);
            const engine = surface.scene.getEngine(), camera = surface.scene.activeCamera!;
            const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
            const mesh = surface.scene.getMeshByName('appearance-probe')!; expect(mesh).not.toBeNull();
            mesh.computeWorldMatrix(true);
            // Final output measurement only: projection never feeds SiteData.
            const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p =>
              Vector3.Project(p, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
            const actual = { width: (Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) * canvas.clientWidth / engine.getRenderWidth(),
              height: (Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))) * canvas.clientHeight / engine.getRenderHeight() };
            const bounds = node.getBoundingClientRect();
            expect(Math.abs(actual.width - bounds.width)).withContext(`${type}/${appearance}: width`).toBeLessThan(.5);
            expect(Math.abs(actual.height - bounds.height)).withContext(`${type}/${appearance}: height`).toBeLessThan(.5);
            surface.scene.render();
            const buffer = await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
            const pixels = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).slice();
            // A solid blank frame must not pass a no-change assertion.
            expect(pixels.some((v, i) => i % 4 === 1 && v > pixels[i - 1] + 40 && v > pixels[i + 1] + 20)).toBeTrue();
            let changedBytes = 0;
            if (baseline) for (let i = 0; i < pixels.length; i++) if (pixels[i] !== baseline[i]) changedBytes++;
            if (appearance === undefined) baseline = pixels;
            else if (appearance === 'none' && ['select', 'checkbox'].includes(type)) expect(changedBytes).withContext('indicator-sensitive control').toBeGreaterThan(0);
            else expect(changedBytes).withContext('appearance variants without a native indicator change').toBe(0);
            let hash = 2166136261; for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
            observations.push({ mode: appearance ?? '<omitted>', browserAppearance: computed.appearance,
              normalAppearance: inspection.normal.appearance ?? '<omitted>', effectiveAppearance: inspection.effective.appearance ?? '<omitted>',
              actual, reference: { width: bounds.width, height: bounds.height }, changedBytes, pixelHash: hash.toString(16),
              renderSize: [engine.getRenderWidth(), engine.getRenderHeight()] });
            expect(JSON.stringify(site)).toBe(original); expect(css.textContent).toBe(originalCss);
          } finally {
            surface.dispose(); expect(surface.scene.meshes.length).toBe(0);
            expect(surface.scene.materials.length).toBe(0); expect(surface.scene.textures.length).toBe(0);
          }
        }
        console.info('MATERIAL_APPEARANCE_INPUT_PROOF', JSON.stringify({ type, dpr: devicePixelRatio, observations }));
      } finally { frame.remove(); canvas.remove(); TestBed.resetTestingModule(); }
    }, 30000);
  }
});
