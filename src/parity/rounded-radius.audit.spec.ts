import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Astylar, type SiteData } from 'astylarui';

// Public-package diagnostic; no Material fixture or private authoring path.
describe('public rounded radius audit', () => {
  for (const type of ['div', 'button'] as const) for (const radius of [24, 36, 9999]) {
    it(`${type} radius ${radius}`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const frame = document.createElement('iframe'), canvas = document.createElement('canvas');
      frame.style.cssText = 'width:520px;height:88px;border:0;display:block';
      canvas.style.cssText = 'width:520px;height:88px;display:block';
      document.body.append(frame, canvas);
      const doc = frame.contentDocument!;
      doc.body.style.margin = '0';
      const native = doc.createElement(type); native.id = 'pane';
      native.style.cssText = `appearance:none;display:block;position:absolute;left:20px;top:20px;width:480px;height:48px;box-sizing:border-box;margin:0;padding:0;border:0 solid transparent;border-radius:${radius}px;background:#302d32;box-shadow:none;outline:none`;
      doc.body.append(native);
      const site: SiteData = { root: { children: [{ type, id: 'pane' }] }, styles: [{
        selector: '#pane', display: 'block', position: 'absolute', left: '20px', top: '20px',
        width: '480px', height: '48px', boxSizing: 'border-box', margin: '0', padding: '0',
        borderWidth: '0', borderStyle: 'solid', borderColor: 'transparent', borderRadius: `${radius}px`,
        background: '#302d32', boxShadow: 'none',
      }] };
      const before = JSON.stringify(site);
      const surface = TestBed.inject(Astylar).mount(canvas, site, { accessibility: false });
      try {
        await surface.whenSettled(); surface.scene.render();
        const style = surface.inspectResolvedStyles().elements.find(n => n.id === 'pane')!;
        expect(style.normal.borderRadius).toBe(`${radius}px`);
        expect(frame.contentWindow!.getComputedStyle(native).borderTopLeftRadius).toBe(`${radius}px`);
        expect(native.getBoundingClientRect().width).toBe(480);
        expect(native.getBoundingClientRect().height).toBe(48);
        expect(JSON.stringify(site)).toBe(before);
        console.log('OVERLAY_LAYOUT_STAGE ' + JSON.stringify({ composition: `radius-${type}-${radius}`,
          dpr: devicePixelRatio, radius, meshes: surface.scene.meshes.map(mesh => ({
            name: mesh.name, vertices: mesh.getTotalVertices(), indices: mesh.getTotalIndices(),
          })) }));
        const capture = (window as Window & { auditCapture?: (info: { composition: string; width: number; height: number }) => Promise<void> }).auditCapture;
        expect(capture).withContext('Run with the public-package audit runner to retain paired pixels').toBeDefined();
        await capture!({ composition: `radius-${type}-${radius}`, width: 520, height: 88 });
      } finally { surface.dispose(); frame.remove(); canvas.remove(); }
    });
  }
});
