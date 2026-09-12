import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Astylar, type SiteData } from 'astylarui';

// Equal inputs, with no Material plugin or fixture-specific identifiers.
// The two color selectors have equal specificity; source order must win.
describe('Material input audit: label cascade stage consistency', () => {
  for (const type of ['label', 'span']) {
    for (const descendantLast of [true, false]) {
      it(`${type}, descendant rule ${descendantLast ? 'last' : 'first'}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const colors = [
          { selector: '.caption.empty', color: '#1d1b20' },
          { selector: '.shell .caption', color: '#e6e1e5' },
        ];
        const site: SiteData = {
          root: { children: [{ type: 'div', id: 'host', class: 'shell', children: [
            { type, id: 'caption', class: 'caption empty', textContent: 'Caption' },
          ] }] },
          styles: [
            { selector: '*', margin: '0', padding: '0', boxSizing: 'border-box' },
            { selector: '#host', width: '320px', height: '80px' },
            { selector: '.caption', display: 'block', width: '160px', height: '32px',
              fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
            ...(descendantLast ? colors : [...colors].reverse()),
          ],
        };
        const before = JSON.stringify(site);
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:320px;height:120px;border:0';
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:320px;height:120px;display:block';
        document.body.append(iframe, canvas);
        const doc = iframe.contentDocument!;
        const sheet = doc.createElement('style');
        sheet.textContent = site.styles.map(({ selector, ...declarations }) => `${selector}{${Object.entries(declarations)
          .map(([key, value]) => `${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        doc.head.append(sheet);
        const host = doc.createElement('div');
        host.id = 'host'; host.className = 'shell';
        const caption = doc.createElement(type);
        caption.id = 'caption'; caption.className = 'caption empty'; caption.textContent = 'Caption';
        host.append(caption); doc.body.append(host);
        const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        try {
          await surface.whenSettled();
          expect(JSON.stringify(site)).withContext('authored input is not mutated').toBe(before);
          expect(surface.diagnostics.messages.filter(message => message.severity === 'error')).toEqual([]);
          const reference = doc.defaultView!.getComputedStyle(caption).color;
          expect(reference).toBe(descendantLast ? 'rgb(230, 225, 229)' : 'rgb(29, 27, 32)');
          const initialMesh = surface.scene.getMeshByName('caption');
          expect(initialMesh).not.toBeNull();
          const normalize = (value: unknown) => {
            const probe = doc.createElement('span');
            probe.style.color = String(value ?? '');
            doc.body.append(probe);
            const result = doc.defaultView!.getComputedStyle(probe).color;
            probe.remove();
            return result;
          };
          for (const phase of ['fresh', 'equivalent-update']) {
            if (phase === 'equivalent-update') {
              await surface.update(structuredClone(site));
              await surface.whenSettled();
              expect(surface.diagnostics.reconciliation?.strategy).withContext('equivalent input retains visuals').toBe('reuse');
              expect(surface.scene.getMeshByName('caption')).toBe(initialMesh);
            }
            const entry = surface.inspectResolvedStyles().elements.find(element => element.id === 'caption')!;
            expect(entry.retainedText?.source).toBe('core-text-registry');
            const observed = { type, descendantLast, phase, reference, normal: entry.normal.color,
              effective: entry.effective.color, retained: entry.retainedText?.style.color };
            console.log('LABEL_CASCADE_AUDIT', JSON.stringify(observed));
            for (const [stage, value] of Object.entries(observed).filter(([stage]) => ['normal', 'effective', 'retained'].includes(stage))) {
              expect(value).withContext(`${stage} color must be present`).toBeDefined();
              expect(normalize(value)).withContext(`${phase}/${stage} must match equal-input browser cascade`).toBe(reference);
            }
          }
        } finally {
          surface.dispose(); iframe.remove(); canvas.remove();
        }
      });
    }
  }
});
