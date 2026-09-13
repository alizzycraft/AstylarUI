import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Astylar, type SiteData } from 'astylarui';

// Equal-input audit only: the same declarations create both sides. An explicit
// template is a separate control, never a replacement for the omitted/none case.
describe('Material audit: grid initial template', () => {
  const trials = (['grid', 'block', 'flex'] as const).flatMap(display =>
    (['columns', 'rows'] as const).flatMap(axis => [120, 240].flatMap(extent =>
      [undefined, 'none', '1fr', `${extent}px`].map(template => ({ display, axis, extent, template })))));
  for (const { display, axis, extent, template } of trials) {
    it(`${display}: ${axis} ${template ?? 'omitted'} in ${extent}px`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:640px;height:360px;border:0';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:640px;height:360px;display:block';
      document.body.append(iframe, canvas);
      const doc = iframe.contentDocument!;
      doc.body.style.margin = '0';
      const property = axis === 'columns' ? 'gridTemplateColumns' : 'gridTemplateRows';
      const site: SiteData = {
        root: { children: [{ type: 'div', id: 'grid-initial', children: [
          { type: 'div', id: 'grid-item' },
          ...(display === 'grid' ? [] : [{ type: 'div', id: 'flow-item' }]),
        ] }] },
        styles: [
          { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0' },
          { selector: '#grid-initial', display, gap: '0',
            width: `${axis === 'columns' ? extent : 120}px`, height: `${axis === 'rows' ? extent : 60}px`,
            ...(axis === 'columns' ? { gridTemplateRows: '60px' } : { gridTemplateColumns: '120px' }),
            ...(template === undefined ? {} : { [property]: template }),
          },
          { selector: '#grid-item, #flow-item', background: '#6750a4',
            ...(display !== 'grid' ? { width: '20px', height: '20px' }
              : axis === 'columns' ? { height: '20px' } : { width: '20px' }),
          },
        ],
      };
      const css = doc.createElement('style');
      css.textContent = site.styles.map(({ selector, ...declarations }) => `${selector}{${Object.entries(declarations)
        .map(([name, value]) => `${name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      doc.head.append(css);
      const parent = doc.createElement('div');
      parent.id = 'grid-initial';
      const item = doc.createElement('div');
      item.id = 'grid-item';
      parent.append(item);
      if (display !== 'grid') {
        const sibling = doc.createElement('div');
        sibling.id = 'flow-item';
        parent.append(sibling);
      }
      doc.body.append(parent);
      const authored = JSON.stringify(site);
      const referenceCss = css.textContent;
      let surface: ReturnType<Astylar['mount']> | undefined;
      try {
        expect(CSS.supports(property.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), template ?? 'none'))
          .withContext('browser accepts the unchanged template grammar').toBeTrue();
        surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
        await surface.whenSettled();
        expect(surface.diagnostics.messages.filter(m => m.severity === 'error')).toEqual([]);
        const inspected = surface.inspectResolvedStyles().elements.find(e => e.id === 'grid-initial')!;
        expect(inspected).toBeDefined();
        for (const stage of [inspected.normal, inspected.effective]) {
          expect(stage.display).toBe(display);
          expect(stage[property]).withContext('preserve the original template declaration').toBe(template);
        }
        const engine = surface.scene.getEngine();
        const viewport = surface.scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const observations: Record<string, unknown> = {};
        for (const id of ['grid-initial', 'grid-item', ...(display === 'grid' ? [] : ['flow-item'])]) {
          const mesh = surface.scene.getMeshByName(id)!;
          expect(mesh).withContext(`${id} exists`).not.toBeNull();
          mesh.computeWorldMatrix(true);
          // Projection is an output measurement only; all inputs and the
          // browser oracle above remain in CSS pixels.
          const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
            Vector3.Project(point, Matrix.IdentityReadOnly, surface!.scene.getTransformMatrix(), viewport));
          const actual = {
            left: Math.min(...points.map(p => p.x)) * canvas.clientWidth / engine.getRenderWidth(),
            right: Math.max(...points.map(p => p.x)) * canvas.clientWidth / engine.getRenderWidth(),
            top: Math.min(...points.map(p => p.y)) * canvas.clientHeight / engine.getRenderHeight(),
            bottom: Math.max(...points.map(p => p.y)) * canvas.clientHeight / engine.getRenderHeight(),
          };
          const expected = doc.getElementById(id)!.getBoundingClientRect();
          observations[id] = { actual, assignedCssSize: mesh.metadata?.astylarGridAssignedSize,
            reference: { left: expected.left, right: expected.right, top: expected.top, bottom: expected.bottom } };
          if (display !== 'grid') {
            expect(mesh.metadata?.astylarGridAssignedSize)
              .withContext('non-grid flow must not receive grid-assigned CSS dimensions').toBeUndefined();
          }
          for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
            expect(Math.abs(actual[edge] - expected[edge]))
              .withContext(`${id}.${edge}: Astylar=${actual[edge]}, browser=${expected[edge]}`).toBeLessThan(.5);
          }
        }
        expect(JSON.stringify(site)).toBe(authored);
        expect(css.textContent).toBe(referenceCss);
        if (display !== 'grid') {
          expect(doc.defaultView!.getComputedStyle(parent)[property])
            .withContext('non-grid computed templates stay declared, not resolved to used tracks').toBe(template ?? 'none');
          const first = item.getBoundingClientRect();
          const next = doc.getElementById('flow-item')!.getBoundingClientRect();
          expect(next.left - first.left).toBe(display === 'flex' ? 20 : 0);
          expect(next.top - first.top).toBe(display === 'block' ? 20 : 0);
        }
        console.info('MATERIAL_GRID_INITIAL_PROOF', JSON.stringify({ display, axis, extent, template: template ?? '<omitted>',
          dpr: devicePixelRatio, resolved: inspected.effective[property],
          referenceUsedTemplate: doc.defaultView!.getComputedStyle(parent)[property], observations }));
      } finally {
        surface?.dispose();
        if (surface) {
          expect(surface.scene.meshes.length).toBe(0);
          expect(surface.scene.materials.length).toBe(0);
          expect(surface.scene.textures.length).toBe(0);
        }
        iframe.remove();
        canvas.remove();
        TestBed.resetTestingModule();
      }
    });
  }
});
