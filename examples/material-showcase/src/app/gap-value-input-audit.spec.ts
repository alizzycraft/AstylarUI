import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData, type StyleRule } from 'astylarui';

// Audit-only equal-input reduction. Browser CSS is serialized from the same
// declarations; longhands are a separate control, never a shorthand workaround.
describe('Material audit: gap grammar and CSS-space length resolution', () => {
  const variants: { name: string; declarations: Partial<StyleRule> }[] = [
    { name: 'omitted', declarations: {} },
    { name: 'normal', declarations: { gap: 'normal' } },
    { name: 'zero', declarations: { gap: '0' } },
    { name: 'one-pixel-value', declarations: { gap: '8px' } },
    { name: 'two-pixel-values', declarations: { gap: '8px 16px' } },
    { name: 'separate-longhands', declarations: { rowGap: '8px', columnGap: '16px' } },
    { name: 'percentage', declarations: { gap: '10%' } },
    { name: 'font-relative', declarations: { gap: '1em' } },
  ];
  for (const mode of ['flex-row', 'flex-column', 'grid'] as const) for (const variant of variants) {
    it(`${mode}/${variant.name}`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const frame = document.createElement('iframe'), canvas = document.createElement('canvas');
      frame.style.cssText = 'width:640px;height:360px;border:0';
      canvas.style.cssText = 'width:640px;height:360px;display:block';
      document.body.append(frame, canvas);
      const doc = frame.contentDocument!, ids = ['gap-one', 'gap-two', 'gap-three', 'gap-four'];
      const site: SiteData = { root: { children: [{ type: 'div', id: 'gap-host', children:
        ids.map(id => ({ type: 'div', id, class: 'gap-item' })) }] }, styles: [
        { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', fontSize: '20px' },
        { selector: '#gap-host', width: mode === 'flex-row' ? '70px' : '140px',
          height: mode === 'flex-column' ? '70px' : '90px',
          display: mode === 'grid' ? 'grid' : 'flex',
          ...(mode === 'grid' ? { gridTemplateColumns: '20px 20px', gridTemplateRows: '20px 20px' }
            : { flexDirection: mode === 'flex-row' ? 'row' : 'column', flexWrap: 'wrap',
              justifyContent: 'flex-start', alignItems: 'flex-start', alignContent: 'flex-start' }),
          ...variant.declarations },
        { selector: '.gap-item', width: '20px', height: '20px', flexShrink: '0', background: '#6750a4' },
      ] };
      const css = doc.createElement('style');
      css.textContent = site.styles.map(({ selector, ...rules }) => `${selector}{${Object.entries(rules)
        .map(([name, value]) => `${name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      doc.head.append(css);
      const host = doc.createElement('div'); host.id = 'gap-host';
      for (const id of ids) { const child = doc.createElement('div'); child.id = id; child.className = 'gap-item'; host.append(child); }
      doc.body.append(host);
      const authored = JSON.stringify(site), referenceCss = css.textContent;
      let surface: ReturnType<Astylar['mount']> | undefined;
      try {
        for (const [name, value] of Object.entries(variant.declarations))
          expect(CSS.supports(name.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), String(value)))
            .withContext('unchanged gap grammar is accepted by the browser').toBeTrue();
        surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        await surface.whenSettled();
        const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === 'gap-host')!;
        expect(inspected).toBeDefined();
        for (const stage of [inspected.normal, inspected.effective]) for (const property of ['gap', 'rowGap', 'columnGap'] as const)
          expect(stage[property]).withContext('core preserves the authored gap request').toBe(variant.declarations[property]);
        const engine = surface.scene.getEngine();
        const viewport = surface.scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const observations = ['gap-host', ...ids].map(id => {
          const mesh = surface!.scene.getMeshByName(id)!;
          expect(mesh).not.toBeNull(); mesh.computeWorldMatrix(true);
          // Output measurement only. No Babylon coordinates feed authored
          // layout, expected geometry, or a compensating transform.
          const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
            Vector3.Project(point, Matrix.IdentityReadOnly, surface!.scene.getTransformMatrix(), viewport));
          const xs = points.map(p => p.x * canvas.clientWidth / engine.getRenderWidth());
          const ys = points.map(p => p.y * canvas.clientHeight / engine.getRenderHeight());
          const rect = doc.getElementById(id)!.getBoundingClientRect();
          return { id, actual: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
            reference: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
        });
        const computed = doc.defaultView!.getComputedStyle(host);
        console.info('MATERIAL_GAP_VALUE_PROOF', JSON.stringify({ mode, variant: variant.name, site,
          css: referenceCss, observations, normal: inspected.normal, effective: inspected.effective,
          browserGap: { rowGap: computed.rowGap, columnGap: computed.columnGap, fontSize: computed.fontSize },
          diagnostics: surface.diagnostics.messages, dpr: devicePixelRatio, userAgent: navigator.userAgent,
          scope: 'Equal authored gap inputs and projected box geometry; not glyph raster or original Material cause.' }));
        expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
        for (const item of observations) for (const key of ['x', 'y', 'width', 'height'] as const)
          expect(Math.abs(item.actual[key] - item.reference[key]))
            .withContext(`${mode}/${variant.name}/${item.id}/${key}: actual=${item.actual[key]}, reference=${item.reference[key]}`)
            .toBeLessThan(.5);
        expect(JSON.stringify(site)).toBe(authored); expect(css.textContent).toBe(referenceCss);
      } finally {
        surface?.dispose();
        if (surface) {
          expect(surface.scene.meshes.length).toBe(0); expect(surface.scene.materials.length).toBe(0); expect(surface.scene.textures.length).toBe(0);
        }
        frame.remove(); canvas.remove(); TestBed.resetTestingModule();
      }
    }, 30000);
  }
});
