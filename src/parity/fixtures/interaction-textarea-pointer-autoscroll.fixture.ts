import type { ParityFixture } from '../parity.types';

const value = 'Alpha\nBravo\nCharlie\nDelta\nEcho\nFoxtrot\nGolf';

export const interactionTextareaPointerAutoscrollFixture: ParityFixture = {
  id: 'interaction-textarea-pointer-autoscroll',
  title: 'Textarea pointer drag beyond its viewport',
  category: 'forms-interactive',
  expectedBehavior:
    'Dragging a held pointer below a multiline textarea viewport extends the selection through off-screen lines while retaining the browser scroll offset before release.',
  measurementIds: ['pointer-scroll-textarea'],
  interactionIds: ['pointer-scroll-textarea'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click'],
  interactionSteps: [
    {
      id: 'begin-drag-near-start',
      actions: [{ type: 'pointer-down', elementId: 'pointer-scroll-textarea', offsetX: 30, offsetY: 16 }],
    },
    {
      id: 'drag-below-viewport',
      actions: [{ type: 'hover', elementId: 'pointer-scroll-textarea', offsetX: 30, offsetY: 116 }],
    },
    { id: 'hold-below-viewport', actions: [{ type: 'pause', durationMs: 250 }] },
    {
      id: 'continue-drag-below-viewport',
      actions: [{ type: 'hover', elementId: 'pointer-scroll-textarea', offsetX: 30, offsetY: 140 }],
    },
    { id: 'hold-further-below-viewport', actions: [{ type: 'pause', durationMs: 250 }] },
    { id: 'release-below-viewport', actions: [{ type: 'pointer-up' }] },
  ],
  reference: {
    html: `<textarea id="pointer-scroll-textarea">${value}</textarea>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdfa; font-family:Arial,sans-serif; }
      #pointer-scroll-textarea { appearance:none; box-sizing:border-box; position:absolute; left:250px; top:210px; width:300px; height:92px; margin:0; padding:10px 14px; border:2px solid #0f766e; border-radius:0; outline:0; resize:none; overflow:auto; scrollbar-width:none; background:#fff; color:#134e4a; font:400 16px/24px Arial,sans-serif; white-space:pre-wrap; }
      #pointer-scroll-textarea::-webkit-scrollbar { display:none; }
      #pointer-scroll-textarea:focus { border-color:#2dd4bf; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdfa', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#pointer-scroll-textarea', boxSizing: 'border-box', position: 'absolute',
        left: '250px', top: '210px', width: '300px', height: '92px', margin: '0',
        padding: '10px 14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#0f766e',
        borderRadius: '0', overflow: 'auto', background: '#ffffff', color: '#134e4a',
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '24px',
        whiteSpace: 'pre-wrap',
      },
      { selector: '#pointer-scroll-textarea:focus', borderColor: '#2dd4bf' },
    ],
    root: { children: [{ type: 'textarea', id: 'pointer-scroll-textarea', value, rows: 3 }] },
  },
};
