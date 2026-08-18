import type { ParityFixture } from '../parity.types';

const value = 'Alpha\nBravo\nCharlie\nDelta\nEcho';

export const interactionTextareaVerticalNavigationFixture: ParityFixture = {
  id: 'interaction-textarea-vertical-navigation',
  title: 'Textarea vertical keyboard navigation',
  category: 'forms-interactive',
  expectedBehavior:
    'ArrowUp and ArrowDown preserve the caret column across textarea lines; Shift extends from a stable anchor, scrolls the focus into view, and an unshifted arrow collapses the range directionally.',
  measurementIds: ['vertical-nav-textarea'],
  interactionIds: ['vertical-nav-textarea'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'keydown', 'keyup'],
  interactionSteps: [
    { id: 'focus-column-two', actions: [{ type: 'click', elementId: 'vertical-nav-textarea', offsetX: 30, offsetY: 16 }] },
    { id: 'move-down-one-line', actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    { id: 'extend-down-one-line', actions: [{ type: 'press-key', key: 'Shift+ArrowDown' }] },
    { id: 'extend-and-scroll-down', actions: [{ type: 'press-key', key: 'Shift+ArrowDown' }] },
    { id: 'collapse-upward', actions: [{ type: 'press-key', key: 'ArrowUp' }] },
    { id: 'return-up-one-line', actions: [{ type: 'press-key', key: 'ArrowUp' }] },
  ],
  reference: {
    html: `<textarea id="vertical-nav-textarea">${value}</textarea>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; font-family:Arial,sans-serif; }
      #vertical-nav-textarea { appearance:none; box-sizing:border-box; position:absolute; left:250px; top:210px; width:300px; height:92px; margin:0; padding:10px 14px; border:2px solid #1d4ed8; border-radius:0; outline:0; resize:none; overflow:auto; scrollbar-width:none; background:#fff; color:#172554; font:400 16px/24px Arial,sans-serif; white-space:pre-wrap; }
      #vertical-nav-textarea::-webkit-scrollbar { display:none; }
      #vertical-nav-textarea:focus { border-color:#60a5fa; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eff6ff', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#vertical-nav-textarea', boxSizing: 'border-box', position: 'absolute',
        left: '250px', top: '210px', width: '300px', height: '92px', margin: '0',
        padding: '10px 14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#1d4ed8',
        borderRadius: '0', overflow: 'auto', background: '#ffffff', color: '#172554',
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '24px',
        whiteSpace: 'pre-wrap',
      },
      { selector: '#vertical-nav-textarea:focus', borderColor: '#60a5fa' },
    ],
    root: { children: [{ type: 'textarea', id: 'vertical-nav-textarea', value, rows: 3 }] },
  },
};
