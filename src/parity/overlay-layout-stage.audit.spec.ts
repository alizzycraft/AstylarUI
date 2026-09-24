import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core';
import { Astylar, type SiteData } from '../lib/index';
import { ASTYLAR_INTERNAL_INSPECTION } from '../lib/astylar';
import { resolveCssViewportRect } from '../app/services/css-layout-geometry';

// Equal-input diagnostic reductions, not replacements for Material fixtures.
// The private inspection symbol is read-only instrumentation, not authoring.
describe('overlay CSS layout versus projection audit', () => {
  for (const composition of ['nested-row', 'flat-column', 'sheet-auto'] as const) {
    for (const [width, height] of (composition === 'sheet-auto' ? [[1440, 1000], [900, 700]] : [[320, 200], [321.5, 201.25]])) {
      it(`${composition} at ${width} x ${height}`, async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const frame = document.createElement('iframe');
        frame.style.cssText = `width:${width}px;height:${height}px;border:0`;
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `width:${width}px;height:${height}px;display:block`;
        document.body.append(frame, canvas);
        const doc = frame.contentDocument!;
        doc.body.style.margin = '0';
        const nested = composition !== 'flat-column';
        const sheet = composition === 'sheet-auto';
        const pane = { type: 'div', id: 'pane', ...(sheet ? { children: [{ type: 'div', id: 'list', children: [
          { type: 'div', id: 'item-a' }, { type: 'div', id: 'item-b' },
        ] }] } : {}) };
        const site: SiteData = {
          root: { children: [{ type: 'div', id: 'host', children: [
            { type: 'div', id: 'overlay', children: nested
              ? [{ type: 'div', id: 'wrapper', children: [pane] }] : [pane] },
          ] }] },
          styles: [
            { selector: '#host, #overlay, #wrapper, #pane, #list, #item-a, #item-b', display: 'block', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none' },
            { selector: '#host', position: 'absolute', left: '40px', top: '30px', width: '180px', height: '90px' },
            { selector: '#overlay', position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
              ...(nested ? {} : { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }) },
            { selector: '#wrapper', position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
              display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
            ...(sheet ? [
              // Geometry-only reduction of captured Material sheet/list rules:
              // no copied computed panel width/height or candidate compensation.
              { selector: '#pane', position: 'relative' as const, minWidth: width > 960 ? '512px' : '100vw',
                ...(width > 960 ? { maxWidth: 'calc(100vw - 256px)' } : {}),
                maxHeight: '80vh', padding: '8px 16px', overflow: 'auto' as const, background: '#302d32' },
              { selector: '#list', boxSizing: 'content-box' as const, padding: '8px 0' },
              { selector: '#item-a, #item-b', height: '48px' },
            ] : [{ selector: '#pane', width: '120px', height: '48px', marginBottom: '8px', background: '#302d32' }]),
          ],
        };
        const css = doc.createElement('style');
        css.textContent = site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
          .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
        doc.head.append(css);
        const append = (nodes: NonNullable<SiteData['root']['children']>, parent: HTMLElement) => {
          for (const node of nodes) {
            const element = doc.createElement(node.type); element.id = node.id!; parent.append(element);
            if (node.children) append(node.children, element);
          }
        };
        append(site.root.children!, doc.body);
        const authoredBefore = JSON.stringify(site);
        let surface: ReturnType<Astylar['mount']> | undefined;
        try {
          const astylar = TestBed.inject(Astylar);
          surface = astylar.mount(canvas, site, { accessibility: false });
          await surface.whenSettled();
          surface.scene.render();
          const manager = astylar[ASTYLAR_INTERNAL_INSPECTION](surface.scene)!.elementManager;
          const engine = surface.scene.getEngine();
          const viewport = surface.scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
          const canvasBox = canvas.getBoundingClientRect();
          const observations = (sheet ? ['host', 'overlay', 'wrapper', 'pane', 'list', 'item-a', 'item-b'] :
            nested ? ['host', 'overlay', 'wrapper', 'pane'] : ['host', 'overlay', 'pane']).map(id => {
            const reference = doc.getElementById(id)!.getBoundingClientRect();
            const mesh = manager.elementsMap.get(id)!;
            mesh.computeWorldMatrix(true);
            const points = mesh.getBoundingInfo().boundingBox.vectorsWorld.map(point =>
              Vector3.Project(point, Matrix.IdentityReadOnly, surface!.scene.getTransformMatrix(), viewport));
            const xs = points.map(p => p.x * canvasBox.width / engine.getRenderWidth());
            const ys = points.map(p => p.y * canvasBox.height / engine.getRenderHeight());
            return { id, parentId: manager.layoutBoxesMap.get(id)?.parentId,
              local: manager.layoutBoxesMap.get(id)?.box.borderBox,
              css: resolveCssViewportRect(id, manager.layoutBoxesMap),
              projected: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
              reference: { x: reference.x, y: reference.y, width: reference.width, height: reference.height } };
          });
          console.log('OVERLAY_LAYOUT_STAGE ' + JSON.stringify({ composition, width, height,
            viewport: { dpr: devicePixelRatio, referenceInnerWidth: frame.contentWindow!.innerWidth,
              referenceInnerHeight: frame.contentWindow!.innerHeight,
              canvasClientWidth: canvas.clientWidth, canvasClientHeight: canvas.clientHeight,
              canvasCssWidth: canvasBox.width, canvasCssHeight: canvasBox.height,
              renderWidth: engine.getRenderWidth(), renderHeight: engine.getRenderHeight(),
              headDisplay: frame.contentWindow!.getComputedStyle(doc.head).display }, observations }));
          expect(JSON.stringify(site)).toBe(authoredBefore);
          for (const observation of observations) {
            expect(observation.css).withContext(observation.id).toBeDefined();
            for (const key of ['x', 'y', 'width', 'height'] as const) {
              expect(observation.css![key]).withContext(`${observation.id} CSS ${key}`).toBeCloseTo(observation.reference[key], 1);
              expect(observation.projected[key]).withContext(`${observation.id} projection ${key}`).toBeCloseTo(observation.css![key], 1);
            }
          }
        } finally {
          surface?.dispose(); frame.remove(); canvas.remove();
        }
      });
    }
  }
});
