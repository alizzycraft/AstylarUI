import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Astylar, type SiteData } from 'astylarui';

// Public equal-input diagnostic. Preserve failing equality assertions: this is
// default-style evidence, not a claim about native range artwork or final pixels.
describe('Material audit: range background defaults', () => {
  for (const disabled of [false, true]) for (const explicit of [false, true]) {
    it(`disabled=${disabled}/explicit=${explicit}`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:320px;height:180px;border:0';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:320px;height:180px;display:block';
      document.body.append(frame, canvas);
      const doc = frame.contentDocument!;
      const input = doc.createElement('input');
      input.id = 'range-background-probe'; input.type = 'range'; input.disabled = disabled;
      input.min = '0'; input.max = '100'; input.step = '1'; input.value = '50';
      doc.body.append(input);
      const site: SiteData = {
        root: { children: [{ type: 'input', inputType: 'range', id: input.id, disabled,
          min: input.min, max: input.max, step: input.step, value: input.value }] },
        styles: [{ selector: 'body', margin: '0', padding: '0' },
          { selector: '#range-background-probe', position: 'absolute', left: '32px', top: '32px',
            width: '120px', height: '44px', margin: '0', padding: '0', borderWidth: '0',
            borderStyle: 'none', borderRadius: '0', fontFamily: 'Arial', fontSize: '16px',
            ...(explicit ? { background: 'transparent' } : {}) }],
      };
      const css = doc.createElement('style');
      css.textContent = site.styles.map(({ selector, ...values }) =>
        `${selector}{${Object.entries(values).map(([key, value]) =>
          `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      doc.head.append(css);
      const original = JSON.stringify(site);
      const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
      try {
        await doc.fonts.ready; await surface.whenSettled();
        expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
        const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === input.id)!;
        expect(inspected).toBeDefined();
        const native = doc.defaultView!.getComputedStyle(input);
        const probe = doc.createElement('div'); doc.body.append(probe);
        const stages = [inspected.normal, inspected.effective].map(style => {
          probe.style.background = '';
          probe.style.background = String(style.background ?? '');
          return { authoredBackground: style.background ?? '<omitted>',
            backgroundColor: doc.defaultView!.getComputedStyle(probe).backgroundColor };
        });
        console.info('MATERIAL_RANGE_BACKGROUND_DEFAULT_PROOF', JSON.stringify({ disabled, explicit,
          dpr: devicePixelRatio, userAgent: navigator.userAgent, site, css: css.textContent,
          browser: { backgroundColor: native.backgroundColor, disabled: input.disabled, opacity: native.opacity },
          stages, diagnostics: surface.diagnostics.messages,
          renderSize: [surface.scene.getEngine().getRenderWidth(), surface.scene.getEngine().getRenderHeight()] }));
        for (const stage of stages) expect(stage.backgroundColor).toBe(native.backgroundColor);
        expect(JSON.stringify(site)).toBe(original);
      } finally {
        surface.dispose();
        expect(surface.scene.meshes.length).toBe(0);
        expect(surface.scene.materials.length).toBe(0);
        expect(surface.scene.textures.length).toBe(0);
        frame.remove(); canvas.remove(); TestBed.resetTestingModule();
      }
    }, 30000);
  }
});
