import type { ParityFixture } from '../parity.types';

export const interactionHoverStyleFixture: ParityFixture = {
  id: 'interaction-hover-style',
  title: 'Authored hover-state paint',
  category: 'controls-states',
  expectedBehavior:
    'Pointer enter applies authored hover paint and pointer leave restores normal paint with browser-order boundary events.',
  measurementIds: ['hover-style-target', 'hover-style-outside'],
  enforcedStyleProperties: {
    'hover-style-target': [
      'backgroundColor',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
      'borderRadius', 'cursor',
    ],
  },
  interactionIds: ['hover-style-target'],
  interactionEventTypes: ['pointerenter', 'pointerleave'],
  interactionSteps: [
    { id: 'enter-target', actions: [{ type: 'hover', elementId: 'hover-style-target' }] },
    { id: 'leave-target', actions: [{ type: 'hover', elementId: 'hover-style-outside' }] },
  ],
  reference: {
    html: `
      <div id="hover-style-target"></div>
      <div id="hover-style-outside"></div>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #hover-style-target { box-sizing:border-box; position:absolute; left:170px; top:210px; width:220px; height:100px; border:4px solid #1e3a8a; border-radius:12px; background:#dbeafe; cursor:default; }
      #hover-style-target:hover { border-width:7px; border-color:#0f766e; border-radius:20px; background:#2563eb; cursor:pointer; }
      #hover-style-outside { box-sizing:border-box; position:absolute; left:500px; top:210px; width:100px; height:100px; background:#e2e8f0; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#hover-style-target', boxSizing: 'border-box', position: 'absolute',
        left: '170px', top: '210px', width: '220px', height: '100px', borderWidth: '4px',
        borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '12px', background: '#dbeafe', cursor: 'default',
      },
      { selector: '#hover-style-target:hover', borderWidth: '7px', borderColor: '#0f766e', borderRadius: '20px', background: '#2563eb', cursor: 'pointer' },
      {
        selector: '#hover-style-outside', boxSizing: 'border-box', position: 'absolute',
        left: '500px', top: '210px', width: '100px', height: '100px', background: '#e2e8f0',
      },
    ],
    root: {
      children: [
        { type: 'div', id: 'hover-style-target' },
        { type: 'div', id: 'hover-style-outside' },
      ],
    },
  },
};
