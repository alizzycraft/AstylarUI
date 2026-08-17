import type { ParityFixture } from '../parity.types';

export const interactionActiveStyleFixture: ParityFixture = {
  id: 'interaction-active-style',
  title: 'Authored active-state paint',
  category: 'controls-states',
  expectedBehavior:
    'Primary pointer down applies authored active paint until pointer up, then restores normal paint and completes click.',
  measurementIds: ['active-style-target'],
  interactionIds: ['active-style-target'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click'],
  interactionSteps: [
    { id: 'press-target', actions: [{ type: 'pointer-down', elementId: 'active-style-target' }] },
    { id: 'release-target', actions: [{ type: 'pointer-up' }] },
  ],
  reference: {
    html: `<div id="active-style-target"></div>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #active-style-target { box-sizing:border-box; position:absolute; left:290px; top:220px; width:220px; height:100px; border:4px solid #1e3a8a; border-radius:12px; background:#dbeafe; }
      #active-style-target:active { background:#1d4ed8; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#active-style-target', boxSizing: 'border-box', position: 'absolute',
        left: '290px', top: '220px', width: '220px', height: '100px', borderWidth: '4px',
        borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '12px', background: '#dbeafe',
      },
      { selector: '#active-style-target:active', background: '#1d4ed8' },
    ],
    root: { children: [{ type: 'div', id: 'active-style-target' }] },
  },
};
