import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from 'astylarui';

// Diagnostic variants only. The browser CSS is generated from exactly the
// same declarations as SiteData. Explicit-font and pixel-box trials are
// controls, not proposed substitutes for inherited/relative font inputs.
describe('Material audit: inherited font-relative boxes', () => {
  for (const parentSize of [24, 32]) for (const mode of ['inherited', 'explicit-px', 'relative-em', 'relative-percent', 'pixel-box']) {
    it(`${parentSize}px parent / ${mode}`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:640px;height:360px;border:0';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:640px;height:360px;display:block';
      document.body.append(iframe, canvas);
      const doc = iframe.contentDocument!;
      doc.body.style.margin = '0';
      const fontSize = mode === 'explicit-px' ? `${parentSize}px`
        : mode === 'relative-em' ? '1.5em' : mode === 'relative-percent' ? '150%' : undefined;
      const site: SiteData = {
        root: { children: [{ type: 'div', id: 'font-parent', children: [
          { type: 'div', id: 'font-box', children: [{ type: 'span', id: 'font-witness', textContent: 'M' }] },
        ] }] },
        styles: [
          { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0' },
          { selector: '#font-parent', display: 'block', width: '320px', height: '180px',
            fontSize: `${parentSize}px`, fontFamily: 'Arial, sans-serif', lineHeight: '48px' },
          { selector: '#font-box', display: 'block',
            width: mode === 'pixel-box' ? `${parentSize * 2}px` : '2em',
            height: mode === 'pixel-box' ? `${parentSize}px` : '1em',
            ...(fontSize === undefined ? {} : { fontSize }), background: '#6750a4' },
          { selector: '#font-witness', display: 'block', color: '#ffffff' },
        ],
      };
      const css = doc.createElement('style');
      css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
        .map(([name, value]) => `${name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      doc.head.append(css);
      const parent = doc.createElement('div'); parent.id = 'font-parent';
      const box = doc.createElement('div'); box.id = 'font-box';
      const witness = doc.createElement('span'); witness.id = 'font-witness'; witness.textContent = 'M';
      box.append(witness); parent.append(box); doc.body.append(parent);
      const original = JSON.stringify(site), originalCss = css.textContent;
      let surface: ReturnType<Astylar['mount']> | undefined;
      try {
        await doc.fonts.ready;
        surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        await surface.whenSettled();
        expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
        const snapshot = surface.inspectResolvedStyles();
        const inspected = snapshot.elements.find(e => e.id === 'font-box')!;
        const text = snapshot.elements.find(e => e.id === 'font-witness')!;
        expect(inspected).toBeDefined();
        expect(text.retainedText?.source).toBe('core-text-registry');
        for (const stage of [inspected.normal, inspected.effective]) {
          expect(stage.fontSize).withContext('local diagnostic declaration stays authored').toBe(fontSize);
          expect(stage.width).toBe(site.styles[2].width);
          expect(stage.height).toBe(site.styles[2].height);
        }
        const browserFont = doc.defaultView!.getComputedStyle(box).fontSize;
        const browserTextFont = doc.defaultView!.getComputedStyle(witness).fontSize;
        expect(text.retainedText?.style.fontSize).withContext('independent retained text font').toBe(browserTextFont);
        const engine = surface.scene.getEngine();
        const viewport = surface.scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const observations: Record<string, unknown> = {};
        for (const id of ['font-parent', 'font-box']) {
          const mesh = surface.scene.getMeshByName(id)!;
          expect(mesh).withContext(id).not.toBeNull();
          mesh.computeWorldMatrix(true);
          // Read the final projected output only; never calculate layout in
          // world space or feed measured browser geometry back into SiteData.
          const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p =>
            Vector3.Project(p, Matrix.IdentityReadOnly, surface!.scene.getTransformMatrix(), viewport));
          const actual = {
            width: (Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) * canvas.clientWidth / engine.getRenderWidth(),
            height: (Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))) * canvas.clientHeight / engine.getRenderHeight(),
          };
          const expected = doc.getElementById(id)!.getBoundingClientRect();
          observations[id] = { actual, reference: { width: expected.width, height: expected.height } };
          for (const axis of ['width', 'height'] as const) expect(Math.abs(actual[axis] - expected[axis]))
            .withContext(`${id}.${axis}: Astylar=${actual[axis]}, browser=${expected[axis]}, computed font=${browserFont}`)
            .toBeLessThan(.5);
        }
        expect(JSON.stringify(site)).toBe(original);
        expect(css.textContent).toBe(originalCss);
        console.info('MATERIAL_FONT_RELATIVE_BOX_PROOF', JSON.stringify({ parentSize, mode,
          dpr: devicePixelRatio, declaredFont: fontSize ?? '<omitted>', browserFont, browserTextFont,
          retainedTextFont: text.retainedText?.style.fontSize, observations }));
      } finally {
        surface?.dispose();
        if (surface) {
          expect(surface.scene.meshes.length).toBe(0);
          expect(surface.scene.materials.length).toBe(0);
          expect(surface.scene.textures.length).toBe(0);
        }
        iframe.remove(); canvas.remove(); TestBed.resetTestingModule();
      }
    });
  }
});
