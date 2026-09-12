import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicTexture } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';
import { provideMaterialShowcasePlugin } from './material-showcase.plugin';

// Diagnostic characterization of the existing private paint path, not a
// contract approving it. These tests deliberately preserve unequal CSS/data
// inputs to identify which one actually controls the bound texture.
describe('Material input audit: private tab-panel typography ownership', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideZonelessChangeDetection(), provideMaterialShowcasePlugin({ benchmarkMode: true }),
  ] }));

  it('observes CSS-independent font and ink inputs on the actual bound private texture', async () => {
    const astylar = TestBed.inject(Astylar);
    const getContext = DynamicTexture.prototype.getContext;
    const seen = new Set<object>();
    const calls: Array<{ texture: DynamicTexture; text: string; font: string; color: string; x: number; y: number }> = [];
    spyOn(DynamicTexture.prototype, 'getContext').and.callFake(function(this: DynamicTexture) {
      const context = getContext.call(this);
      if (!seen.has(context)) {
        seen.add(context);
        const texture = this, fillText = context.fillText;
        spyOn(context, 'fillText').and.callFake(function(this: typeof context, ...args: Parameters<typeof fillText>) {
          calls.push({ texture, text: String(args[0]), font: this.font, color: String(this.fillStyle), x: args[1], y: args[2] });
          return fillText.apply(this, args);
        });
      }
      return context;
    });

    const observations: Array<{ referenceSize: string; font: string; color: string; x: number; y: number }> = [];
    for (const [cssSize, dataSize] of [[24, 16], [30, 16], [24, 20]]) {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:100px;';
      const reference = document.createElement('span');
      reference.textContent = 'Overview content';
      Object.assign(reference.style, { fontFamily: 'serif', fontSize: `${cssSize}px`, fontWeight: '700',
        lineHeight: '32px', letterSpacing: '2px', color: '#123456' });
      const canvas = document.createElement('canvas');
      host.append(reference, canvas);
      document.body.append(host);
      const site: SiteData = {
        plugins: [{ id: 'showcase.material', versionRange: '^1.0.0', schemaVersion: 1 }],
        root: { children: [{ type: 'showcase.material:tab-panel', id: 'audit-panel',
          data: { selected: true, phase: 1, 'font-size': dataSize, 'text-color': '#ff0000', 'baseline-offset': 0 } }] },
        styles: [{ selector: '#audit-panel', width: '240px', height: '48px', fontFamily: 'serif',
          fontSize: `${cssSize}px`, fontWeight: '700', lineHeight: '32px', letterSpacing: '2px', color: '#123456' }],
      };
      const surface = astylar.mount(canvas, site);
      try {
        await surface.whenSettled();
        const panel = surface.scene.meshes.find((mesh) => mesh.metadata?.showcaseMaterialVisual === 'tab-panel');
        const content = panel?.getChildMeshes().find((mesh) => mesh.name.endsWith('-content-plane'));
        const textures = content?.material?.getActiveTextures() ?? [];
        const drawn = calls.filter((call) => textures.includes(call.texture) && call.text === 'Overview content');
        expect(drawn.length).toBeGreaterThan(0);
        const paint = drawn.at(-1)!;
        expect(paint.texture.getSize().width).toBe(480);
        expect(paint.texture.getSize().height).toBe(96);
        expect(paint.font).toBe(`${dataSize * 2}px Roboto, Arial, sans-serif`);
        expect(paint.color).toBe('#ff0000');
        expect(paint.x).toBe(0);
        expect(paint.y).toBeCloseTo(48 + dataSize * 2 * .328125, 6);
        const computed = getComputedStyle(reference);
        expect(computed.fontSize).toBe(`${cssSize}px`);
        expect(computed.fontWeight).toBe('700');
        expect(computed.color).toBe('rgb(18, 52, 86)');
        observations.push({ referenceSize: computed.fontSize, font: paint.font, color: paint.color, x: paint.x, y: paint.y });
      } finally {
        surface.dispose();
        expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
        host.remove();
      }
    }
    expect(observations[0].referenceSize).not.toBe(observations[1].referenceSize);
    expect(observations[0].font).toBe(observations[1].font);
    expect(observations[0].referenceSize).toBe(observations[2].referenceSize);
    expect(observations[0].font).not.toBe(observations[2].font);
    // This is evidence of competing plugin typography, not glyph sharpness,
    // baseline equivalence, or a core renderer failing equal input.
  });
});
