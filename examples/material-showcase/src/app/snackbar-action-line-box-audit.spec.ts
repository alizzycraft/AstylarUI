import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Astylar, type SiteData } from 'astylarui';

// Audit reduction only. The unequal trial deliberately retains the missing
// candidate font-size; the two equal-input controls are separate experiments.
// Neither their input nor the browser oracle is derived from candidate paint.
describe('Material audit: snackbar action font-size and normal line box', () => {
  const fontFamily = 'SnackbarAuditRoboto, Arial, sans-serif';
  let font: FontFace;
  beforeAll(async () => {
    font = new FontFace('SnackbarAuditRoboto',
      'url(/audit-fonts/roboto-latin-500-normal.woff2)', { weight: '500' });
    await font.load();
    document.fonts.add(font);
  });
  afterAll(() => { if (font) document.fonts.delete(font); });

  const trials = [
    { name: 'equal explicit 14px', referenceSize: 14, candidateSize: 14, expectedCandidateSize: 14 },
    { name: 'equal explicit 16px', referenceSize: 16, candidateSize: 16, expectedCandidateSize: 16 },
    { name: 'unequal omitted candidate size', referenceSize: 14, candidateSize: undefined, expectedCandidateSize: 16 },
  ];
  for (const parentSize of [14.4, 16, 18.4]) {
    for (const lineHeight of ['normal', undefined] as const) {
      for (const trial of trials) {
        it(`${trial.name}; parent ${parentSize}px; line-height ${lineHeight ?? 'omitted'}`, async () => {
          TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
          const host = document.createElement('div');
          const canvas = document.createElement('canvas');
          const reference = document.createElement('button');
          const lineBox = document.createElement('div');
          host.style.cssText = `position:relative;width:640px;height:240px;line-height:normal;font-size:${parentSize}px`;
          canvas.style.cssText = 'width:640px;height:160px;display:block';
          host.append(reference, lineBox, canvas);
          document.body.append(host);
          const typography = {
            fontFamily, fontWeight: '500', fontStyle: 'normal', letterSpacing: '0px',
            wordSpacing: '0px', whiteSpace: 'nowrap', textTransform: 'none',
            textDecoration: 'none', ...(lineHeight ? { lineHeight } : {}),
          };
          for (const element of [reference, lineBox]) {
            element.style.cssText = 'display:block;box-sizing:border-box;width:320px;padding:0;margin:0;border:0';
            Object.assign(element.style, typography, { fontSize: `${trial.referenceSize}px` });
            element.textContent = 'UNDO';
          }
          reference.style.height = '48px';
          // Natural one-line CSS observer, not the fixed-height button box.
          lineBox.style.height = 'auto';
          const site: SiteData = {
            root: { children: [{ type: 'main', id: 'page', children: [
              { type: 'button', id: 'audit-action', value: 'UNDO' },
            ] }] },
            styles: [
              { selector: '#page', width: '640px', height: '160px', fontSize: `${parentSize}px` },
              { selector: '#audit-action', display: 'block', boxSizing: 'border-box',
                width: '320px', height: '48px', padding: '0', margin: '0', borderWidth: '0',
                ...typography,
                ...(trial.candidateSize === undefined ? {} : { fontSize: `${trial.candidateSize}px` }),
              },
            ],
          };
          const authored = JSON.stringify(site);
          const referenceAuthored = reference.getAttribute('style');
          let surface: ReturnType<Astylar['mount']> | undefined;
          try {
            for (const size of [14, 16]) {
              await document.fonts.load(`500 ${size}px ${fontFamily}`, 'UNDO');
              expect(document.fonts.check(`500 ${size}px ${fontFamily}`, 'UNDO')).toBeTrue();
            }
            await document.fonts.ready;
            expect(font.status).toBe('loaded');
            surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
            await surface.whenSettled();
            const entries = surface.inspectResolvedStyles().elements;
            const action = entries.find((entry) => entry.id === 'audit-action')!;
            const page = entries.find((entry) => entry.id === 'page')!;
            const paint = action.paintedControlText;
            expect(page.normal.fontSize).toBe(`${parentSize}px`);
            for (const stage of [action.normal, action.effective]) {
              expect(stage.fontSize).toBe(`${trial.expectedCandidateSize}px`);
              expect(stage.lineHeight).toBe(lineHeight);
            }
            expect(paint?.source).toBe('core-control-texture');
            expect(paint?.text).toBe('UNDO');
            expect(paint?.style.fontFamily).toBe(fontFamily);
            expect(paint?.style.fontSize).toBe(trial.expectedCandidateSize);
            expect(String(paint?.style.fontWeight)).toBe('500');
            expect(paint?.style.fontStyle).toBe('normal');
            expect(paint?.style.letterSpacing).toBe(0);
            expect(paint?.style.wordSpacing).toBe(0);
            expect(paint?.style.whiteSpace).toBe('nowrap');
            const computed = getComputedStyle(reference);
            const observer = getComputedStyle(lineBox);
            for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
              'lineHeight', 'letterSpacing', 'wordSpacing', 'whiteSpace'] as const) {
              expect(observer[property]).withContext(`independent observer ${property}`).toBe(computed[property]);
            }
            expect(computed.fontSize).toBe(`${trial.referenceSize}px`);
            expect(computed.lineHeight).toBe('normal');
            const browserHeight = parseFloat(observer.height);
            expect(browserHeight).toBeGreaterThan(0);
            expect(lineBox.getBoundingClientRect().height).toBe(browserHeight);
            const paintHeight = paint!.style.lineHeight * paint!.style.fontSize;
            const label = surface.scene.getMeshByName('buttonLabel_audit-action');
            expect(label?.isEnabled()).toBeTrue();
            const textures = [...new Set(label!.material!.getActiveTextures())]
              .filter((texture) => texture.metadata?.astylarLogicalTextSize);
            expect(textures.length).withContext('unique currently bound text texture').toBe(1);
            const textureHeight = textures[0].metadata.astylarLogicalTextSize.height as number;
            expect(Number.isFinite(paintHeight)).toBeTrue();
            expect(Math.abs(textureHeight - paintHeight)).toBeLessThan(.1);
            if (trial.candidateSize === undefined) {
              // Diagnostic assertion of the defect's input dependency, NOT an
              // accepted-equivalence assertion for the original snackbar.
              expect(paint!.style.fontSize).not.toBe(trial.referenceSize);
              expect(paintHeight - browserHeight).toBeGreaterThan(1);
            } else {
              expect(Math.abs(paintHeight - browserHeight))
                .withContext('equal typography must have the same natural line height').toBeLessThan(.1);
            }
            expect(JSON.stringify(site)).withContext('preserve candidate authored omission').toBe(authored);
            expect(reference.getAttribute('style')).withContext('preserve browser oracle').toBe(referenceAuthored);
            console.info('MATERIAL_SNACKBAR_LINE_BOX_PROOF', JSON.stringify({
              trial: trial.name, parentSize, lineHeight: lineHeight ?? 'omitted',
              referenceFontSize: computed.fontSize, normalFontSize: action.normal.fontSize,
              effectiveFontSize: action.effective.fontSize, paintFontSize: paint!.style.fontSize,
              browserHeight, paintHeight, textureHeight, dpr: devicePixelRatio,
            }));
          } finally {
            surface?.dispose();
            if (surface) {
              expect(surface.scene.meshes.length).toBe(0);
              expect(surface.scene.materials.length).toBe(0);
              expect(surface.scene.textures.length).toBe(0);
            }
            host.remove();
            TestBed.resetTestingModule();
          }
        });
      }
    }
  }
});
