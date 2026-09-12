import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Astylar, provideAstylar, type DOMElement, type SiteData } from 'astylarui';
import { collectAuthoredInputTree, collectMaterialCoreResolvedStyles } from './material-input-evidence';

// Each browser declaration is generated from the very same rule object sent
// to Astylar. These reductions intentionally contain no Material component,
// measured height table, DPR correction, or duplicate position calculation.
describe('Material audit: equivalent CSS input reductions', () => {
  const cases: Array<{ name: string; site: SiteData; ids: string[]; horizontalOnly?: string[]; loadedCss?: boolean; controlLabels?: string[]; controlTextWidths?: string[]; resolved?: Array<{ id: string; properties: string[]; stage?: 'retainedText' | 'paintedControlText' }> }> = [
    ...['MaterialAuditUnavailableFont_8c176e', 'MaterialAuditUnavailableFont_8c176e, serif', 'MaterialAuditUnavailableFont_8c176e, sans-serif'].map((fontFamily) => ({
      name: `control texture text advance matches browser fallback for ${fontFamily}`,
      site: {
        root: { children: [{ type: 'button', id: 'fallback-button', value: 'WWWWiiiiMMMMmmmm' }] },
        styles: [{ selector: '#fallback-button', display: 'block', width: '320px', height: '48px', fontFamily,
          fontSize: '20px', lineHeight: '24px', fontWeight: '400', letterSpacing: '0px', wordSpacing: '0px',
          whiteSpace: 'nowrap', color: '#123456', background: '#eeeeee', textAlign: 'center' }],
      } as SiteData,
      ids: ['fallback-button'],
      controlLabels: ['fallback-button'],
      controlTextWidths: ['fallback-button'],
    })),
    ...['Arial', 'Arial, sans-serif'].map((fontFamily) => ({
      name: `control texture preserves the authored font-family list ${fontFamily}`,
      site: {
        root: { children: [{ type: 'button', id: 'font-list-button', value: 'Action' }] },
        styles: [{ selector: '#font-list-button', display: 'block', width: '160px', height: '48px', fontFamily,
          fontSize: '16px', lineHeight: '24px', color: '#123456', background: '#eeeeee', textAlign: 'center' }],
      } as SiteData,
      ids: ['font-list-button'],
      controlLabels: ['font-list-button'],
      resolved: [
        { id: 'font-list-button', properties: ['fontFamily'] },
        { id: 'font-list-button', properties: ['fontFamily'], stage: 'paintedControlText' as const },
      ],
    })),
    ...(['value', 'textContent'] as const).map((textField) => ({
      name: `rendered button labels authored with ${textField} expose pre-paint typography in core inspection`,
      site: {
        root: { children: [{ type: 'button', id: 'inspected-button', [textField]: 'Action' }] },
        styles: [{ selector: '#inspected-button', display: 'block', width: '160px', height: '48px', fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', letterSpacing: '0.5px', color: '#123456', background: '#eeeeee', textAlign: 'center' }],
      } as SiteData,
      ids: ['inspected-button'],
      controlLabels: ['inspected-button'],
      resolved: [{ id: 'inspected-button', properties: ['fontSize', 'lineHeight', 'letterSpacing'], stage: 'paintedControlText' as const }],
    })),
    ...[
      { name: '1 parent transform', transform: 'translateY(-50%) scale(1)' },
      { name: '0.75 parent transform', transform: 'translateY(-50%) scale(.75)' },
      { name: 'untransformed control', transform: 'none' },
      { name: 'literal translation control', transform: 'translateY(-12px) scale(1)' },
      { name: 'scale-only control', transform: 'scale(.75)' },
      { name: 'default-origin scale control', transform: 'scale(.75)', defaultOrigin: true },
      { name: 'translate-then-scale order control', transform: 'translateX(10px) scale(.5)', defaultOrigin: true },
      { name: 'scale-then-translate order control', transform: 'scale(.5) translateX(10px)', defaultOrigin: true },
      { name: 'repeated-translation composition control', transform: 'translateX(4px) translateX(6px)', defaultOrigin: true },
    ].map(({ name, transform, defaultOrigin }) => ({
      name: `floating label preserves child typography through a ${name}`,
      site: {
        root: { children: [{ type: 'div', id: 'floating-field', children: [
          { type: 'label', id: 'floating-wrapper', children: [
            { type: 'span', id: 'floating-text', textContent: 'Project name' },
          ] },
        ] }] },
        styles: [
          { selector: '#floating-field', position: 'relative', width: '240px', height: '80px', fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', letterSpacing: '0.496px' },
          // Original CSS intent includes transform-origin, which is not yet a
          // public StyleRule field. Retain it in this diagnostic reduction to
          // expose the gap, not to claim that the current public API supports it.
          { selector: '#floating-wrapper', position: 'absolute', display: 'block', width: '160px', height: '24px', top: '40px', left: '16px', ...(defaultOrigin ? {} : { transformOrigin: 'left top' }), transform },
        ],
      } as SiteData,
      ids: ['floating-field', 'floating-wrapper', 'floating-text'],
      horizontalOnly: ['floating-text'],
      resolved: [{ id: 'floating-text', properties: ['fontSize', 'lineHeight', 'letterSpacing'], stage: 'retainedText' as const }],
    })),
    ...([-12, 12] as const).map((margin) => ({
      name: `absolute left and bottom insets position the margin box with ${margin}px margins`,
      site: {
        root: { children: [{ type: 'div', id: 'margin-parent', children: [
          { type: 'div', id: 'margin-child' },
        ] }] },
        styles: [
          { selector: '#margin-parent', position: 'relative', width: '180px', height: '100px' },
          { selector: '#margin-child', position: 'absolute', left: '40px', bottom: '20px', width: '16px', height: '16px', margin: `${margin}px`, background: '#6750a4' },
        ],
      } as SiteData,
      ids: ['margin-parent', 'margin-child'],
    })),
    ...(['inline', 'inline-block'] as const).map((display) => ({
      name: `content-sized ${display} badge host anchors a positioned child without measured width`,
      site: {
        root: { children: [{ type: 'div', id: 'badge-frame', children: [
          { type: 'span', id: 'badge-anchor', children: [
            { type: 'span', id: 'badge-label', textContent: 'Notifications' },
            { type: 'span', id: 'badge-bubble', textContent: '4' },
          ] },
        ] }] },
        styles: [
          { selector: '#badge-frame', width: '280px', height: '80px', padding: '20px', fontFamily: 'Arial', fontSize: '16px', lineHeight: '20px' },
          { selector: '#badge-anchor', display, position: 'relative', overflow: 'visible' },
          { selector: '#badge-bubble', position: 'absolute', left: '100%', bottom: '100%', minWidth: '16px', minHeight: '16px', margin: '-12px', padding: '0 4px', fontSize: '11px', lineHeight: '16px', textAlign: 'center', whiteSpace: 'nowrap', background: '#b3261e', color: '#ffffff', borderRadius: '9999px' },
        ],
      } as SiteData,
      ids: ['badge-frame', 'badge-anchor', 'badge-label', 'badge-bubble'],
      // Inline text fragments and core text planes are not the same vertical
      // measurement object. This proof checks their horizontal contribution,
      // then all four edges of the positioned badge; it makes no ink-box claim.
      horizontalOnly: display === 'inline' ? ['badge-anchor', 'badge-label'] : ['badge-label'],
    })),
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
      resolved: [
        { id: 'first-cell', properties: ['padding', 'borderWidth', 'fontSize', 'lineHeight'] },
        { id: 'first-cell', properties: ['fontSize', 'lineHeight'], stage: 'retainedText' },
        { id: 'last-cell', properties: ['fontSize', 'lineHeight'], stage: 'retainedText' },
      ],
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

  for (const entry of cases.filter((candidate) => candidate.name.startsWith('content-sized '))) {
    cases.push({
      ...entry,
      name: entry.name.replace('badge host anchors a positioned child without measured width', 'host derives width from an in-flow child without an overlay'),
      site: {
        ...entry.site,
        root: { children: entry.site.root.children!.map((frame) => ({
          ...frame,
          children: frame.children!.map((anchor) => ({
            ...anchor, children: anchor.children!.filter((child) => child.id !== 'badge-bubble'),
          })),
        })) },
        styles: entry.site.styles.filter((rule) => rule.selector !== '#badge-bubble'),
      },
      ids: entry.ids.filter((id) => id !== 'badge-bubble'),
    });
  }

  // Exercise the existing core-owned CSS resolver with the original expressions,
  // not fixture-side arithmetic or browser measurements copied into SiteData.
  // Keep the direct-style limitation cases above, including their failures.
  for (const entry of cases.filter((candidate) => candidate.name.endsWith('original calc expressions'))) {
    cases.push({
      ...entry,
      name: `${entry.name} through loaded document CSS`,
      loadedCss: true,
      resolved: [
        { id: 'tile-list', properties: ['width', 'height'] },
        { id: 'tile-one', properties: ['width', 'height', 'left'] },
        { id: 'tile-two', properties: ['width', 'height', 'left'] },
      ],
    });
  }

  for (const entry of cases) {
    it(entry.name, async () => {
      TestBed.configureTestingModule({ providers: [
        provideZonelessChangeDetection(),
        ...(entry.loadedCss ? [provideAstylar({ css: { useDocumentStyles: true } })] : []),
      ] });
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
      const scope = 'material-input-loaded-proof';
      const selectorFor = (selector: string) => entry.loadedCss
        ? selector.split(',').map((part) => `${part.trim()}:where(.${scope})`).join(',')
        : selector;
      css.textContent = rules.map(({ selector, ...declarations }) => `${selectorFor(selector)}{${Object.entries(declarations)
        .map(([property, value]) => `${property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}:${value}`).join(';')}}`).join('\n');
      doc.head.append(css);
      const loadedStyle = entry.loadedCss ? document.createElement('style') : undefined;
      if (loadedStyle) {
        // Both realms receive exactly the same scoped CSS. No wrapper is added,
        // and the host's Karma controls/canvas are not matched by the reset.
        loadedStyle.textContent = css.textContent;
        document.head.append(loadedStyle);
      }
      const scopeChildren = (children: readonly DOMElement[]): DOMElement[] => children.map((child) => ({
        ...child,
        class: [child.class, scope].filter(Boolean).join(' '),
        ...(child.children ? { children: scopeChildren(child.children) } : {}),
      }));
      const site: SiteData = entry.loadedCss
        ? { ...entry.site, root: { ...entry.site.root, children: scopeChildren(entry.site.root.children ?? []) }, styles: [] }
        : { ...entry.site, styles: rules };
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
          // Astylar's button value is its visible label, whereas HTML button
          // value is submission data. Express the same visible content in DOM.
          if (child.type === 'button' && child.textContent === undefined && child.value !== undefined) element.textContent = String(child.value);
          parent.append(element);
          append(element, child.children ?? []);
        }
      };
      append(doc.body, site.root.children ?? []);
      const surface = TestBed.inject(Astylar).mount(canvas, site, { diagnostics: { logLevel: 'silent' } });
      try {
        await surface.whenSettled();
        for (const id of entry.controlLabels ?? []) {
          // Output presence distinguishes missing inspection evidence from a
          // control that never created a label. Never use its projected size
          // or the authored rule as a substitute for the actual paint inputs.
          const label = surface.scene.getMeshByName(`buttonLabel_${id}`);
          expect(label).withContext(`${id} rendered control label`).not.toBeNull();
          expect(label?.isEnabled()).withContext(`${id} enabled control label`).toBeTrue();
          expect(label?.visibility).withContext(`${id} control label visibility`).toBeGreaterThan(0);
        }
        for (const id of entry.controlTextWidths ?? []) {
          // Measure output from the currently bound label texture, not a new
          // canvas configured from fixture declarations or registry styles.
          // Core records the logical CSS advance used to size this texture,
          // separately from its integer physical-pixel backing dimensions.
          // The reference Range measures the same single-line text advance.
          // This deliberately makes no assertion about final glyph raster ink.
          const label = surface.scene.getMeshByName(`buttonLabel_${id}`)!;
          // A material can bind the same texture in both diffuse and emissive
          // slots. Count texture identities, not material slot references.
          const textures = [...new Set(label.material!.getActiveTextures())].filter((texture) => texture.metadata?.astylarLogicalTextSize);
          expect(textures.length).withContext(`${id} unique bound text texture`).toBe(1);
          const actual = textures[0].metadata.astylarLogicalTextSize.width as number;
          expect(Number.isFinite(actual)).withContext(`${id} CSS texture width`).toBeTrue();
          expect(actual).withContext(`${id} nonempty texture width`).toBeGreaterThan(0);
          const range = doc.createRange();
          range.selectNodeContents(doc.getElementById(id)!);
          const expected = range.getBoundingClientRect().width;
          const paint = surface.inspectResolvedStyles().elements.find((element) => element.id === id)!.paintedControlText;
          expect(paint?.source).toBe('core-control-texture');
          expect(Math.abs(actual - expected))
            .withContext(`${id} text advance: Astylar=${actual}, browser=${expected}, painted font=${paint?.style.fontFamily}`)
            .toBeLessThan(.1);
        }
        if (entry.resolved) {
          const snapshot = surface.inspectResolvedStyles();
          if (entry.controlLabels) {
            const provenance = collectMaterialCoreResolvedStyles(snapshot);
            const tree = collectAuthoredInputTree(site.root, site.styles, provenance.effective, provenance);
            expect(tree.paintedControlTextEvidenceVersion).toBe(1);
            for (const id of entry.controlLabels) {
              const inspected = snapshot.elements.find((element) => element.id === id)!;
              expect(tree.nodes).toContain(jasmine.objectContaining({ key: inspected.path,
                paintedControlText: inspected.paintedControlText }));
            }
          }
          const normalize = (value: unknown) => String(value ?? '').trim().replace(/\b0px\b/g, '0');
          for (const { id, properties, stage } of entry.resolved) {
            const inspected = snapshot.elements.find((element) => element.id === id)!;
            if (stage === 'retainedText') expect(inspected.retainedText?.source).toBe('core-text-registry');
            if (stage === 'paintedControlText') expect(inspected.paintedControlText?.source).toBe('core-control-texture');
            const actual = stage === 'paintedControlText' ? inspected.paintedControlText?.style
              : stage === 'retainedText' ? inspected.retainedText?.style : inspected.normal;
            const expected = doc.defaultView!.getComputedStyle(doc.getElementById(id)!);
            for (const property of properties) {
              const cssProperty = property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
              let value = (actual as Record<string, unknown> | undefined)?.[property];
              // Normalize the documented parsed units only for comparison.
              // Neither declarations nor rendered dimensions supply a fallback.
              if (stage === 'paintedControlText' && typeof value === 'number') {
                if (property === 'lineHeight' && typeof actual?.fontSize === 'number') value = `${value * actual.fontSize}px`;
                else if (['fontSize', 'letterSpacing', 'wordSpacing'].includes(property)) value = `${value}px`;
              }
              expect(normalize(value)).withContext(`${id} ${stage ?? 'resolved'} ${property}`)
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
          const edges = entry.horizontalOnly?.includes(id) ? ['left', 'right'] as const : ['left', 'right', 'top', 'bottom'] as const;
          for (const edge of edges) {
            expect(Math.abs(actual[edge] - expected[edge])).withContext(`${id}.${edge}: Astylar=${actual[edge]}, browser=${expected[edge]}`).toBeLessThan(.5);
          }
        }
      } finally {
        surface.dispose();
        loadedStyle?.remove();
        iframe.remove();
        canvas.remove();
        TestBed.resetTestingModule();
      }
    });
  }
});
