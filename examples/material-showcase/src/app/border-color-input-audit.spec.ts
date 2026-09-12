import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StandardMaterial } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Audit proof, not a compensating showcase fixture. The same declaration map
// generates both CSS and SiteData. Keep browser expectations even when they fail.
// CSS Backgrounds 3 §3.1: omitted border color is currentcolor, not transparent.
describe('Material input audit: border color defaults and alpha', () => {
  afterEach(() => TestBed.resetTestingModule());

  for (const color of ['#123456', '#c04a20']) {
    for (const mode of ['omitted', 'explicit', 'currentColor', 'transparent', 'rgba'] as const) {
      it(`${mode} border with color ${color}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const rgb = [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
        const borderColor = mode === 'explicit' ? color : mode === 'rgba'
          ? `rgba(${rgb.join(',')},0.5)` : mode === 'omitted' ? undefined : mode;
        const rule = { selector: '#box', display: 'block', boxSizing: 'border-box',
          width: '120px', height: '60px', margin: '16px', padding: '0',
          background: '#ffffff', color, borderWidth: '4px', borderStyle: 'solid',
          borderRadius: '0', opacity: '1', ...(borderColor === undefined ? {} : { borderColor }) } as const;
        const site: SiteData = { root: { children: [{ type: 'div', id: 'box' }] }, styles: [
          { selector: 'body', margin: '0', padding: '0', background: '#ffffff' }, rule,
        ] };
        const authored = JSON.stringify(site);
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'display:block;width:200px;height:120px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;width:200px;height:120px';
        document.body.append(iframe, canvas);
        let surface: ReturnType<Astylar['mount']> | undefined;
        try {
          const doc = iframe.contentDocument!;
          const sheet = doc.createElement('style');
          sheet.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
            .map(([key, value]) => `${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}:${value}`).join(';')}}`).join('\n');
          doc.head.append(sheet);
          const box = doc.createElement('div'); box.id = 'box'; doc.body.append(box);
          const computed = doc.defaultView!.getComputedStyle(box);
          const reference = { color: computed.color, borderColor: computed.borderTopColor,
            borderWidth: computed.borderTopWidth, borderStyle: computed.borderTopStyle,
            width: box.getBoundingClientRect().width, height: box.getBoundingClientRect().height };
          const expectedAlpha = mode === 'transparent' ? 0 : mode === 'rgba' ? .5 : 1;
          const expectedRgb = mode === 'transparent' ? [0, 0, 0] : rgb;
          expect(reference.borderColor).toBe(expectedAlpha === 1 ? `rgb(${expectedRgb.join(', ')})`
            : `rgba(${expectedRgb.join(', ')}, ${expectedAlpha})`);
          expect(reference.borderWidth).toBe('4px');
          expect(reference.borderStyle).toBe('solid');
          expect([reference.width, reference.height]).toEqual([120, 60]);

          surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
          await surface.whenSettled();
          expect(JSON.stringify(site)).withContext('mount must preserve authored input').toBe(authored);
          expect(surface.diagnostics.messages.filter(message => message.severity === 'error')).toEqual([]);
          const input = surface.inspectResolvedStyles().elements.find(entry => entry.id === 'box')!;
          expect(input).toBeDefined();
          expect(input.normal.color).toBe(color);
          expect(input.effective.color).toBe(color);
          expect(input.effective.borderWidth).toBe('4px');
          expect(input.effective.borderStyle).toBe('solid');

          // Inspect materials actually bound to this box's border meshes, not a
          // speculative parsed color or an unbound material with a matching name.
          const mesh = surface.scene.getMeshByName('box');
          expect(mesh).not.toBeNull();
          const borders = mesh!.getChildMeshes().filter(child => child.material?.name === 'box-border-material');
          if (expectedAlpha > 0) expect(borders.length).toBeGreaterThan(0);
          expect(borders.every(border => border.isEnabled() && border.isVisible)).toBeTrue();
          const materials = [...new Set(borders.map(border => border.material))];
          expect(materials.length).toBeLessThanOrEqual(1);
          if (materials.length) expect(materials[0] instanceof StandardMaterial).toBeTrue();
          const material = materials[0] as StandardMaterial | undefined;
          const boundRgb = material?.emissiveColor.asArray().map(channel => Math.round(channel * 255));

          // Read the actual framebuffer after rendering. This checks that the
          // observed color reaches the canvas; it does not assert border geometry
          // or substitute a synthetic canvas for a browser screenshot.
          surface.scene.render();
          const engine = surface.scene.getEngine();
          const raw = await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
          const pixels = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
          const countColor = (target: number[]) => {
            let count = 0;
            for (let index = 0; index < pixels.length; index += 4) {
              if (pixels[index + 3] > 250 && target.every((channel, offset) => Math.abs(pixels[index + offset] - channel) <= 2)) count++;
            }
            return count;
          };
          const expectedCompositedRgb = expectedRgb.map(channel => Math.round(channel * expectedAlpha + 255 * (1 - expectedAlpha)));
          const raster = { blackPixels: countColor([0, 0, 0]), authoredColorPixels: countColor(rgb),
            expectedCompositedPixels: countColor(expectedCompositedRgb), boundColorPixels: boundRgb ? countColor(boundRgb) : 0,
            byteCount: pixels.length };
          console.info('MATERIAL_BORDER_COLOR_INPUT_AUDIT', JSON.stringify({ mode, color, borderColor: borderColor ?? '<omitted>',
            reference, normalBorderColor: input.normal.borderColor, effectiveBorderColor: input.effective.borderColor,
            boundRgb, boundAlpha: material?.alpha, disableLighting: material?.disableLighting,
            borderMeshCount: borders.length, expectedRgb, expectedAlpha, expectedCompositedRgb, raster,
            viewport: [200, 120], dpr: devicePixelRatio, browser: navigator.userAgent,
            geometryParityVerified: false, pairedScreenRasterVerified: false }));

          if (material) {
            expect(material.disableLighting).toBeTrue();
            // A fully transparent color has no observable RGB; omitting its
            // paint meshes is also legitimate. Nonzero-alpha color must survive.
            if (expectedAlpha > 0) expect(boundRgb).withContext('bound border color must match equal-input browser used color').toEqual(expectedRgb);
            expect(material.alpha).withContext('border paint must retain color alpha').toBe(expectedAlpha);
          }
          expect(raster.expectedCompositedPixels).withContext('expected border color must reach the framebuffer').toBeGreaterThan(100);
          if (expectedAlpha === 0) expect(raster.blackPixels).withContext('transparent border cannot paint opaque black').toBe(0);
        } finally {
          surface?.dispose();
          if (surface) expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
          iframe.remove(); canvas.remove();
        }
      });
    }
  }
});
