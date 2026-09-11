import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Astylar, type DOMElement, type SiteData } from 'astylarui';

// Each browser declaration is generated from the very same rule object sent
// to Astylar. These reductions intentionally contain no Material component,
// measured height table, DPR correction, or duplicate position calculation.
describe('Material audit: equivalent CSS input reductions', () => {
  const cases: Array<{ name: string; site: SiteData; ids: string[] }> = [
    {
      name: 'toolbar content widths and a flex spacer require no measured constants',
      site: {
        root: { children: [{ type: 'div', id: 'toolbar', children: [
          { type: 'span', id: 'title', textContent: 'Material workspace' },
          { type: 'div', id: 'spacer' },
          { type: 'span', id: 'action', textContent: 'Action' },
        ] }] },
        styles: [
          { selector: '#toolbar', width: '360px', height: '56px', padding: '0 16px', display: 'flex', alignItems: 'center', fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', whiteSpace: 'nowrap', background: '#eeeeee' },
          { selector: '#title, #action', display: 'block', flexShrink: '0', background: '#cccccc' },
          { selector: '#spacer', flexGrow: '1', height: '1px', background: '#aaaaaa' },
          { selector: '#action', padding: '0 12px' },
        ],
      }, ids: ['toolbar', 'title', 'action'],
    },
    {
      name: 'stepper connector flexes between headers without breakpoint percentages',
      site: {
        root: { children: [{ type: 'div', id: 'header', children: [
          { type: 'div', id: 'first-step' }, { type: 'div', id: 'connector' }, { type: 'div', id: 'last-step' },
        ] }] },
        styles: [
          { selector: '#header', width: '360px', display: 'flex', alignItems: 'center', background: '#eeeeee' },
          { selector: '#first-step, #last-step', width: '100px', height: '72px', flexShrink: '0', background: '#cccccc' },
          { selector: '#connector', flex: 'auto', height: '0', minWidth: '32px', margin: '0 -16px', borderWidth: '1px 0 0', borderStyle: 'solid', borderColor: '#6750a4' },
        ],
      }, ids: ['header', 'first-step', 'connector', 'last-step'],
    },
    {
      name: 'content determines a padded flex container height',
      site: {
        root: { children: [{ type: 'div', id: 'flow', children: [
          { type: 'div', id: 'first' }, { type: 'div', id: 'second' },
        ] }] },
        styles: [
          { selector: '#flow', display: 'flex', flexDirection: 'column', width: '240px', padding: '28px', gap: '12px', background: '#eeeeee' },
          { selector: '#first, #second', height: '40px', background: '#6750a4' },
        ],
      }, ids: ['flow', 'first', 'second'],
    },
    {
      name: 'full-span calendar marker preserves auto-placed day cells',
      site: {
        root: { children: [{ type: 'div', id: 'calendar', children: [
          { type: 'div', id: 'marker' }, { type: 'div', id: 'day', children: [{ type: 'div', id: 'ring' }] },
          { type: 'div', id: 'next-day' },
        ] }] },
        styles: [
          { selector: '#calendar', display: 'grid', width: '280px', height: '120px', gridTemplateColumns: 'repeat(7, 40px)', gridTemplateRows: 'repeat(3, 40px)', background: '#eeeeee' },
          { selector: '#marker', gridColumn: '1 / -1', background: '#dddddd' },
          { selector: '#day', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eeeeee' },
          { selector: '#ring', width: '36px', height: '36px', borderRadius: '18px', background: '#6750a4' },
          { selector: '#next-day', background: '#aaaaaa' },
        ],
      }, ids: ['calendar', 'marker', 'day', 'ring', 'next-day'],
    },
    {
      name: 'fixed flex overlay anchors a surface to the viewport bottom',
      site: {
        root: { children: [{ type: 'div', id: 'overlay', children: [{ type: 'div', id: 'surface' }] }] },
        styles: [
          { selector: '#overlay', position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '8px', background: '#eeeeee' },
          { selector: '#surface', width: '240px', height: '48px', background: '#322f35' },
        ],
      }, ids: ['overlay', 'surface'],
    },
  ];

  for (const entry of cases) {
    it(entry.name, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:640px;height:360px;border:0';
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:640px;height:360px;display:block';
      document.body.append(iframe, canvas);
      const doc = iframe.contentDocument!;
      doc.body.style.margin = '0';
      const rules: SiteData['styles'] = [
        { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0' },
        ...entry.site.styles,
      ];
      const css = doc.createElement('style');
      css.textContent = rules.map(({ selector, ...declarations }) => `${selector}{${Object.entries(declarations)
        .map(([property, value]) => `${property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      doc.head.append(css);
      const append = (parent: HTMLElement, children: readonly DOMElement[]) => {
        for (const child of children) {
          const element = doc.createElement(child.type);
          element.id = child.id!;
          if (child.textContent !== undefined) element.textContent = String(child.textContent);
          parent.append(element);
          append(element, child.children ?? []);
        }
      };
      append(doc.body, entry.site.root.children ?? []);
      const surface = TestBed.inject(Astylar).mount(canvas, { ...entry.site, styles: rules }, { diagnostics: { logLevel: 'silent' } });
      try {
        await surface.whenSettled();
        const engine = surface.scene.getEngine();
        const viewport = surface.scene.activeCamera!.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        for (const id of entry.ids) {
          const mesh = surface.scene.meshes.find((candidate) => candidate.name === id);
          expect(mesh).withContext(id).toBeDefined();
          mesh!.computeWorldMatrix(true);
          // Project final output solely to measure it. All input above is CSS.
          const points = mesh!.getBoundingInfo().boundingBox.vectorsWorld.map((point) =>
            Vector3.Project(point, Matrix.IdentityReadOnly, surface.scene.getTransformMatrix(), viewport));
          const actual = {
            left: Math.min(...points.map((point) => point.x)) * canvas.clientWidth / engine.getRenderWidth(),
            right: Math.max(...points.map((point) => point.x)) * canvas.clientWidth / engine.getRenderWidth(),
            top: Math.min(...points.map((point) => point.y)) * canvas.clientHeight / engine.getRenderHeight(),
            bottom: Math.max(...points.map((point) => point.y)) * canvas.clientHeight / engine.getRenderHeight(),
          };
          const expected = doc.getElementById(id)!.getBoundingClientRect();
          for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
            expect(Math.abs(actual[edge] - expected[edge])).withContext(`${id}.${edge}: Astylar=${actual[edge]}, browser=${expected[edge]}`).toBeLessThan(.5);
          }
        }
      } finally {
        surface.dispose();
        iframe.remove();
        canvas.remove();
        TestBed.resetTestingModule();
      }
    });
  }
});
