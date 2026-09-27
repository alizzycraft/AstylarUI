import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicTexture } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';
import { provideMaterialShowcasePlugin } from './material-showcase.plugin';

// Matched wrapping diagnostic; separate from the frozen typography evidence.
describe('Material input audit: private tab-panel wrapping ownership', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideZonelessChangeDetection(), provideMaterialShowcasePlugin({ benchmarkMode: true }),
  ] }));

  it('retains one private paint line when matched native normal text wraps at a narrow width', async () => {
    const astylar = TestBed.inject(Astylar);
    const getContext = DynamicTexture.prototype.getContext;
    const seen = new Set<object>();
    const calls: Array<{ texture: DynamicTexture; text: string; font: string; width: number; y: number }> = [];
    spyOn(DynamicTexture.prototype, 'getContext').and.callFake(function(this: DynamicTexture) {
      const context = getContext.call(this);
      if (!seen.has(context)) {
        seen.add(context);
        const texture = this, fillText = context.fillText;
        spyOn(context, 'fillText').and.callFake(function(this: typeof context, ...args: Parameters<typeof fillText>) {
          calls.push({ texture, text: String(args[0]), font: this.font,
            width: this.measureText(String(args[0])).width, y: args[2] });
          return fillText.apply(this, args);
        });
      }
      return context;
    });
    const font = new FontFace('Roboto', 'url(/audit-fonts/roboto-latin-400-normal.woff2)', { weight: '400' });
    await font.load(); document.fonts.add(font);
    try { for (const whiteSpace of ['normal', 'nowrap']) {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:160px;';
      const reference = document.createElement('div');
      reference.textContent = 'Overview content';
      Object.assign(reference.style, { width: '100px', height: '48px', fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: '16px', fontWeight: '400', lineHeight: '20px', whiteSpace, color: '#123456' });
      const canvas = document.createElement('canvas');
      host.append(reference, canvas); document.body.append(host);
      const site: SiteData = {
        plugins: [{ id: 'showcase.material', versionRange: '^1.0.0', schemaVersion: 1 }],
        root: { children: [{ type: 'showcase.material:tab-panel', id: 'audit-wrap-panel',
          data: { selected: true, 'font-size': 16, 'text-color': '#123456', 'baseline-offset': 0 } }] },
        styles: [{ selector: '#audit-wrap-panel', width: '100px', height: '48px',
          fontFamily: 'Roboto, Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '20px',
          whiteSpace, color: '#123456' }],
      };
      const surface = astylar.mount(canvas, site);
      try {
        await surface.whenSettled();
        const text = reference.firstChild!;
        const wordTop = (start: number, end: number) => {
          const range = document.createRange(); range.setStart(text, start); range.setEnd(text, end);
          return range.getBoundingClientRect().top;
        };
        const delta = wordTop(9, 16) - wordTop(0, 8);
        expect(delta).toBeCloseTo(whiteSpace === 'normal' ? 20 : 0, 4);
        const panel = surface.scene.meshes.find(mesh => mesh.metadata?.showcaseMaterialVisual === 'tab-panel');
        const content = panel?.getChildMeshes().find(mesh => mesh.name.endsWith('-content-plane'));
        const textures = content?.material?.getActiveTextures() ?? [];
        const drawn = calls.filter(call => textures.includes(call.texture));
        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn.every(call => call.text === 'Overview content')).toBeTrue();
        expect(new Set(drawn.map(call => call.y)).size).toBe(1);
        expect(drawn.at(-1)!.font).toBe('32px Roboto, Arial, sans-serif');
        expect(drawn.at(-1)!.texture.getSize().width).toBe(200);
        expect(drawn.at(-1)!.width).toBeGreaterThan(200);
      } finally {
        surface.dispose();
        expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
        host.remove();
      }
    } } finally { document.fonts.delete(font); }
    // This locates wrapping outside shared CSS text layout; it does not certify
    // raster clipping, sharpness, baseline equivalence or a core renderer defect.
  });
});
