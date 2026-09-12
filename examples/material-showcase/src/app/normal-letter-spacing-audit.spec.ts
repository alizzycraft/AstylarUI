import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicTexture } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// CSS Text 3 section 7.2 defines normal as computed zero, serialized by
// getComputedStyle as normal. This proof tests that representation boundary;
// it does not approve unrelated typography, layout or final screen rasters.
describe('Material audit: normal and zero letter-spacing', () => {
  const fonts: FontFace[] = [];
  beforeAll(async () => {
    const face = new FontFace('MaterialAuditTrackingRoboto',
      'url(/audit-fonts/roboto-latin-400-normal.woff2)', { weight: '400' });
    await face.load();
    document.fonts.add(face);
    fonts.push(face);
  });
  afterAll(() => { for (const face of fonts) document.fonts.delete(face); });
  afterEach(() => TestBed.resetTestingModule());

  for (const fontFamily of ['MaterialAuditTrackingRoboto, Arial, sans-serif', 'Arial, sans-serif']) {
    for (const text of ['31', 'Primary action', 'office AV']) {
      it(`${fontFamily}: ${text}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const observations: Array<{ authored: string; computed: string; browserWidth: number;
          textureWidth: number; textureHeight: number; pixels: Uint8ClampedArray }> = [];
        for (const letterSpacing of ['normal', '0px', '2px']) {
          const host = document.createElement('div');
          host.style.cssText = 'position:relative;width:640px;height:240px';
          const canvas = document.createElement('canvas');
          canvas.style.cssText = 'display:block;width:640px;height:160px';
          const reference = document.createElement('button');
          const rule = { display: 'block', boxSizing: 'border-box', width: '320px', height: '48px',
            padding: '0', margin: '0', borderWidth: '0', fontFamily, fontSize: '16px', fontWeight: '400',
            fontStyle: 'normal', lineHeight: '24px', letterSpacing, wordSpacing: '0px',
            whiteSpace: 'nowrap', textAlign: 'center', textTransform: 'none', textDecoration: 'none',
            color: '#123456', background: '#eeeeee' } as const;
          Object.assign(reference.style, rule);
          reference.textContent = text;
          host.append(reference, canvas);
          document.body.append(host);
          const site: SiteData = { root: { children: [{ type: 'button', id: 'tracking-control', value: text }] },
            styles: [{ selector: '#tracking-control', ...rule }] };
          let surface: ReturnType<Astylar['mount']> | undefined;
          try {
            await document.fonts.load(`400 16px ${fontFamily}`, text);
            await document.fonts.ready;
            surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
            await surface.whenSettled();
            const input = surface.inspectResolvedStyles().elements.find((entry) => entry.id === 'tracking-control')!;
            expect(input.normal.letterSpacing).toBe(letterSpacing);
            expect(input.effective.letterSpacing).toBe(letterSpacing);
            expect(input.paintedControlText?.source).toBe('core-control-texture');
            expect(input.paintedControlText?.text).toBe(text);
            expect(input.paintedControlText?.style.fontFamily).toBe(fontFamily);
            expect(input.paintedControlText?.style.letterSpacing).toBe(letterSpacing === '2px' ? 2 : 0);
            const label = surface.scene.getMeshByName('buttonLabel_tracking-control');
            expect(label?.isEnabled()).toBeTrue();
            const textures = [...new Set(label!.material!.getActiveTextures())]
              .filter((texture) => texture.metadata?.astylarLogicalTextSize);
            expect(textures.length).toBe(1);
            expect(textures[0] instanceof DynamicTexture).toBeTrue();
            const texture = textures[0] as DynamicTexture;
            const size = texture.getSize();
            const pixels = texture.getContext().getImageData(0, 0, size.width, size.height).data;
            expect(pixels.some((value, index) => index % 4 === 3 && value > 0)).toBeTrue();
            const range = document.createRange();
            range.selectNodeContents(reference);
            const browserWidth = range.getBoundingClientRect().width;
            const textureWidth = texture.metadata.astylarLogicalTextSize.width as number;
            const computed = getComputedStyle(reference);
            const observer = document.createElement('canvas').getContext('2d')!;
            observer.font = `${rule.fontStyle} ${rule.fontWeight} ${rule.fontSize} ${fontFamily}`;
            observer.letterSpacing = letterSpacing === 'normal' ? '0px' : letterSpacing;
            const kerningWidths = Object.fromEntries((['auto', 'normal', 'none'] as const).map((kerning) => {
              observer.fontKerning = kerning;
              return [kerning, observer.measureText(text).width];
            }));
            console.info('MATERIAL_TRACKING_SHAPING_DIAGNOSTIC', JSON.stringify({ fontFamily, text, letterSpacing,
              computedFont: computed.font, computedKerning: computed.fontKerning,
              computedTextRendering: computed.textRendering, browserWidth, textureWidth, kerningWidths }));
            // The nonzero control is only a sensitivity check, not a waiver of
            // the separate CSS line-edge/shaping rules for nonzero tracking.
            if (letterSpacing !== '2px') {
              expect(Math.abs(textureWidth - browserWidth)).withContext('same-input text advance').toBeLessThan(.1);
            }
            observations.push({ authored: letterSpacing, computed: getComputedStyle(reference).letterSpacing,
              browserWidth, textureWidth, textureHeight: texture.metadata.astylarLogicalTextSize.height, pixels });
          } finally {
            surface?.dispose();
            if (surface) expect(surface.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
            host.remove();
          }
        }
        const [normal, zero, spaced] = observations;
        expect(normal.computed).toBe('normal');
        expect(zero.computed).toBe('normal');
        expect(spaced.computed).toBe('2px');
        expect(normal.browserWidth).toBe(zero.browserWidth);
        expect(normal.textureWidth).toBe(zero.textureWidth);
        expect(normal.textureHeight).toBe(zero.textureHeight);
        expect(normal.pixels).withContext('actual bound texture bytes, normal versus zero').toEqual(zero.pixels);
        expect(spaced.browserWidth).toBeGreaterThan(normal.browserWidth);
        expect(spaced.textureWidth).toBeGreaterThan(normal.textureWidth);
        console.info('MATERIAL_NORMAL_TRACKING_PROOF', JSON.stringify({ fontFamily, text,
          observations: observations.map(({ pixels, ...entry }) => ({ ...entry, byteCount: pixels.length })),
          normalZeroTextureBytesEqual: normal.pixels.every((value, index) => value === zero.pixels[index]),
          finalScreenRasterVerified: false }));
      });
    }
  }
});
