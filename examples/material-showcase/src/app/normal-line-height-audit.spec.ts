import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Astylar, type SiteData } from 'astylarui';

// Diagnostic input proof, not a screenshot fixture or a renderer fix. Browser
// computed `normal` is not a used pixel height. Measure a natural one-line DOM
// block with the same typography instead of treating `normal` as a constant.
describe('Material audit: control normal line-height resolution', () => {
  const fonts: FontFace[] = [];
  beforeAll(async () => {
    // Use the same local Roboto bytes as the showcase, under an isolated name
    // so Karma's global stylesheet font URL handling cannot silently fall back.
    for (const weight of ['400', '500']) {
      const face = new FontFace('MaterialAuditRoboto', `url(/audit-fonts/roboto-latin-${weight}-normal.woff2)`, { weight });
      await face.load();
      document.fonts.add(face);
      fonts.push(face);
    }
  });
  afterAll(() => { for (const face of fonts) document.fonts.delete(face); });
  const cases = [
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', lineHeight: 'normal', text: 'Primary action' },
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', text: 'Primary action' },
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '17.5px', fontWeight: '400', lineHeight: 'normal', text: 'Mg' },
    { fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: 'normal', text: 'Mg' },
    { fontFamily: 'serif', fontSize: '20px', fontWeight: '400', lineHeight: 'normal', text: 'Mg' },
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', lineHeight: 'normal', text: 'A😀' },
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', lineHeight: 'normal', text: 'A漢' },
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', lineHeight: '21px', text: 'Primary action' },
    { fontFamily: 'MaterialAuditRoboto, Arial, sans-serif', fontSize: '14px', fontWeight: '500', lineHeight: '1.5', text: 'Primary action' },
  ];

  for (const entry of cases) {
    it(`${entry.fontFamily} ${entry.fontSize}/${entry.lineHeight ?? 'omitted'} ${entry.text}`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const host = document.createElement('div');
      const canvas = document.createElement('canvas');
      const reference = document.createElement('button');
      const lineBox = document.createElement('div');
      host.style.cssText = 'position:relative;width:640px;height:240px';
      canvas.style.cssText = 'width:640px;height:160px;display:block';
      document.body.append(host);
      host.append(reference, lineBox, canvas);
      const typography = {
        fontFamily: entry.fontFamily, fontSize: entry.fontSize, fontWeight: entry.fontWeight,
        fontStyle: 'normal', letterSpacing: '0px', wordSpacing: '0px',
        whiteSpace: 'nowrap', textTransform: 'none', textDecoration: 'none',
        ...(entry.lineHeight ? { lineHeight: entry.lineHeight } : {}),
      };
      // Establish the same initial normal line-height on both sides when the
      // case omits the property; do not inherit the Karma host's typography.
      host.style.lineHeight = 'normal';
      for (const element of [reference, lineBox]) {
        element.style.cssText = 'display:block;box-sizing:border-box;width:320px;padding:0;margin:0;border:0';
        Object.assign(element.style, typography);
        element.textContent = entry.text;
      }
      reference.style.height = '48px';
      // This separate observer keeps the button's fixed container height out
      // of the expected text line-height. It has identical typography/content,
      // auto height, and no children, padding, borders or transforms.
      lineBox.style.height = 'auto';
      const site: SiteData = {
        root: { children: [{ type: 'button', id: 'normal-control', value: entry.text }] },
        styles: [{ selector: '#normal-control', display: 'block', boxSizing: 'border-box',
          width: '320px', height: '48px', padding: '0', margin: '0', borderWidth: '0',
          ...typography }],
      };
      let surface: ReturnType<Astylar['mount']> | undefined;
      try {
        await document.fonts.load(`${entry.fontWeight} ${entry.fontSize} ${entry.fontFamily}`, entry.text);
        await document.fonts.ready;
        surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        await surface.whenSettled();
        const inspected = surface.inspectResolvedStyles().elements.find((element) => element.id === 'normal-control')!;
        const paint = inspected.paintedControlText;
        expect(paint?.source).toBe('core-control-texture');
        expect(paint?.text).toBe(entry.text);
        const computed = getComputedStyle(reference), observer = getComputedStyle(lineBox);
        for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing', 'whiteSpace'] as const) {
          expect(observer[property]).withContext(`line-box observer ${property}`).toBe(computed[property]);
        }
        expect(inspected.normal.lineHeight).toBe(entry.lineHeight);
        expect(paint?.style.fontFamily).toBe(entry.fontFamily);
        expect(paint?.style.fontSize).toBe(parseFloat(entry.fontSize));
        expect(String(paint?.style.fontWeight === 'normal' ? '400' : paint?.style.fontWeight)).toBe(entry.fontWeight);
        expect(String(paint?.style.fontStyle)).toBe(typography.fontStyle);
        expect(paint?.style.letterSpacing).toBe(0);
        expect(paint?.style.wordSpacing).toBe(0);
        expect(String(paint?.style.whiteSpace)).toBe(typography.whiteSpace);
        const usedLineHeight = paint!.style.lineHeight * paint!.style.fontSize;
        const label = surface.scene.getMeshByName('buttonLabel_normal-control');
        expect(label?.isEnabled()).toBeTrue();
        const textures = [...new Set(label!.material!.getActiveTextures())]
          .filter((texture) => texture.metadata?.astylarLogicalTextSize);
        expect(textures.length).withContext('unique currently bound text texture').toBe(1);
        const textureHeight = textures[0].metadata.astylarLogicalTextSize.height as number;
        const expected = lineBox.getBoundingClientRect().height;
        expect(Number.isFinite(usedLineHeight)).toBeTrue();
        expect(expected).toBeGreaterThan(0);
        expect(Math.abs(usedLineHeight - expected))
          .withContext(`current paint line-height=${usedLineHeight}, natural browser line box=${expected}, computed=${computed.lineHeight}`)
          .toBeLessThan(.1);
        expect(Math.abs(textureHeight - expected))
          .withContext(`current texture CSS height=${textureHeight}, natural browser line box=${expected}`)
          .toBeLessThan(.1);
        console.info('MATERIAL_NORMAL_LINE_HEIGHT_PROOF', JSON.stringify({ ...entry,
          computed: computed.lineHeight, browserLineBox: expected, currentPaintLineHeight: usedLineHeight, textureHeight }));
      } finally {
        surface?.dispose();
        host.remove();
        TestBed.resetTestingModule();
      }
    });
  }
});
