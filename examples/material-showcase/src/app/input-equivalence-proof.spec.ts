import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Astylar, type DOMElement, type SiteData } from 'astylarui';

// Each browser declaration is generated from the very same rule object sent
// to Astylar. These reductions intentionally contain no Material component,
// measured height table, DPR correction, or duplicate position calculation.
describe('Material audit: equivalent CSS input reductions', () => {
  const cases: Array<{ name: string; site: SiteData; ids: string[]; resolved?: Array<{ id: string; properties: string[]; stage?: 'retainedText' }> }> = [
    ...(['block', 'flex'] as const).map((display) => ({
      name: `opposing absolute insets determine auto size for a text-bearing ${display} box`,
      site: {
        root: { children: [{ type: 'div', id: 'inset-parent', children: [
          { type: 'div', id: 'inset-child', textContent: 'Inset text' },
        ] }] },
        styles: [
          { selector: '#inset-parent', position: 'relative', width: '280px', height: '100px', fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px' },
          { selector: '#inset-child', position: 'absolute', display, top: '10px', bottom: '15px', left: '12px', right: '18px', background: '#dddddd' },
        ],
      } as SiteData,
      ids: ['inset-parent', 'inset-child'],
    })),
    // Retain the expression cases even if the independent literal controls pass.
    // Direct StyleRule calc() is a documented limitation; these controls isolate
    // the downstream positioning path, not a proposed fixture-side resolver.
    ...[280, 480].flatMap((width) => [false, true].map((literal) => ({
      name: `positioned grid-list tiles preserve a one-pixel gutter at ${width}px with ${literal ? 'literal control values' : 'original calc expressions'}`,
      site: {
        root: { children: [{ type: 'div', id: 'tile-list', children: [
          { type: 'div', id: 'tile-one', class: 'tile', children: [{ type: 'div', id: 'tile-one-content', class: 'tile-content', textContent: 'One' }] },
          { type: 'div', id: 'tile-two', class: 'tile', children: [{ type: 'div', id: 'tile-two-content', class: 'tile-content', textContent: 'Two' }] },
        ] }] },
        styles: [
          { selector: '#tile-list', position: 'relative', display: 'block', width: `${width}px`, height: literal ? '80px' : 'calc(80px)', fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px' },
          { selector: '.tile', position: 'absolute', display: 'block', top: '0', width: literal ? `${width / 2 - .5}px` : 'calc(50% - 0.5px)', height: literal ? '80px' : 'calc(80px)', overflow: 'hidden', background: '#dddddd' },
          { selector: '#tile-one', left: '0' },
          { selector: '#tile-two', left: literal ? `${width / 2 + .5}px` : 'calc(50% + 0.5px)' },
          { selector: '.tile-content', position: 'absolute', top: '0', bottom: '0', left: '0', right: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        ],
      } as SiteData,
      ids: ['tile-list', 'tile-one', 'tile-two', 'tile-one-content', 'tile-two-content'],
    }))),
    {
      name: 'side drawer uses containing-block insets and content margin without a flex replacement',
      site: {
        root: { children: [{ type: 'div', id: 'drawer-container', children: [
          { type: 'aside', id: 'drawer', children: [{ type: 'div', id: 'drawer-inner', textContent: 'Navigation' }] },
          { type: 'main', id: 'drawer-content', textContent: 'Main content' },
        ] }] },
        styles: [
          { selector: '#drawer-container', position: 'relative', display: 'block', width: '360px', height: '220px', overflow: 'hidden', fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px', background: '#eeeeee' },
          { selector: '#drawer', position: 'absolute', top: '0', bottom: '0', left: '0', width: '160px', padding: '20px', borderWidth: '0 1px 0 0', borderStyle: 'solid', borderColor: 'transparent', overflow: 'auto', background: '#dddddd' },
          { selector: '#drawer-inner', boxSizing: 'content-box', width: '100%', height: '100%', overflow: 'auto' },
          { selector: '#drawer-content', position: 'relative', display: 'block', boxSizing: 'content-box', height: '100%', marginLeft: '160px', padding: '20px', overflow: 'auto', background: '#cccccc' },
        ],
      }, ids: ['drawer-container', 'drawer', 'drawer-inner', 'drawer-content'],
    },
    {
      name: 'inherited typography remains observable in pre-projection style evidence',
      site: {
        root: { children: [{ type: 'div', id: 'type-parent', children: [
          { type: 'div', id: 'type-child', textContent: 'Inherited type' },
        ] }] },
        styles: [
          { selector: '#type-parent', width: '360px', height: '80px', fontFamily: 'Arial', fontSize: '24px', lineHeight: '32px', color: '#123456' },
        ],
      }, ids: ['type-parent', 'type-child'],
      resolved: [{ id: 'type-child', properties: ['fontSize', 'lineHeight'], stage: 'retainedText' }],
    },
    {
      name: 'table cells retain authored padding and bottom borders without sibling rules',
      site: {
        root: { children: [{ type: 'table', id: 'border-table', class: 'data-table', tableProperties: { tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }, children: [
          { type: 'tbody', id: 'body', children: [
            { type: 'tr', id: 'first-row', children: [{ type: 'td', id: 'first-cell', textContent: 'Atlas' }] },
            { type: 'tr', id: 'last-row', children: [{ type: 'td', id: 'last-cell', textContent: 'Northstar' }] },
          ] },
        ] }] },
        styles: [
          { selector: '#border-table', width: '360px', height: '104px', fontFamily: 'Arial', fontSize: '14px', lineHeight: '20px', background: '#eeeeee' },
          { selector: 'tr', height: '52px' },
          { selector: '.data-table td', padding: '0 16px', fontSize: '14px', lineHeight: '20px', verticalAlign: 'middle', background: '#dddddd' },
          { selector: '#first-cell', borderWidth: '0 0 1px', borderStyle: 'solid', borderColor: '#79747e' },
        ],
      }, ids: ['border-table', 'first-row', 'last-row', 'first-cell', 'last-cell'],
      resolved: [{ id: 'first-cell', properties: ['padding', 'borderWidth', 'fontSize', 'lineHeight'] }],
    },
    {
      name: 'paragraph flow places a divider without absolute text or separator offsets',
      site: {
        root: { children: [{ type: 'section', id: 'divider-demo', children: [
          { type: 'p', id: 'above', textContent: 'Above' },
          { type: 'div', id: 'separator' },
          { type: 'p', id: 'below', textContent: 'Below' },
        ] }] },
        styles: [
          { selector: '#divider-demo', width: '360px', padding: '28px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cac4d0', fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px', background: '#eeeeee' },
          { selector: 'p', margin: '16px 0', background: '#dddddd' },
          { selector: '#separator', display: 'block', borderWidth: '1px 0 0', borderStyle: 'solid', borderColor: '#79747e' },
        ],
      }, ids: ['divider-demo', 'above', 'separator', 'below'],
    },
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
          if (child.class) element.className = child.class;
          if (child.tableProperties) {
            // Public table options express these CSS declarations separately
            // from StyleRule. Project the same inputs into the reference DOM.
            const { tableLayout, borderCollapse, borderSpacing } = child.tableProperties;
            if (tableLayout) element.style.tableLayout = tableLayout;
            if (borderCollapse) element.style.borderCollapse = borderCollapse;
            if (borderSpacing !== undefined) element.style.borderSpacing = `${borderSpacing}px`;
          }
          if (child.textContent !== undefined) element.textContent = String(child.textContent);
          parent.append(element);
          append(element, child.children ?? []);
        }
      };
      append(doc.body, entry.site.root.children ?? []);
      const surface = TestBed.inject(Astylar).mount(canvas, { ...entry.site, styles: rules }, { diagnostics: { logLevel: 'silent' } });
      try {
        await surface.whenSettled();
        if (entry.resolved) {
          const snapshot = surface.inspectResolvedStyles();
          const normalize = (value: unknown) => String(value ?? '').trim().replace(/\b0px\b/g, '0');
          for (const { id, properties, stage } of entry.resolved) {
            const inspected = snapshot.elements.find((element) => element.id === id)!;
            if (stage === 'retainedText') expect(inspected.retainedText?.source).toBe('core-text-registry');
            const actual = stage === 'retainedText' ? inspected.retainedText?.style : inspected.normal;
            const expected = doc.defaultView!.getComputedStyle(doc.getElementById(id)!);
            for (const property of properties) {
              const cssProperty = property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
              expect(normalize((actual as Record<string, unknown> | undefined)?.[property])).withContext(`${id} ${stage ?? 'resolved'} ${property}`)
                .toBe(normalize(expected.getPropertyValue(cssProperty)));
            }
          }
        }
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
