import type { ParityFixture } from '../parity.types';

export const interactionDocumentTextSelectionFixture: ParityFixture = {
  id: 'interaction-document-text-selection',
  title: 'Non-control text selection',
  category: 'forms-interactive',
  expectedBehavior:
    'Forward and backward pointer drags select the same authored text range, direction, and visible highlight as browser document text, and clicking outside clears either selection.',
  measurementIds: ['document-selection-copy', 'document-selection-outside'],
  interactionIds: ['document-selection-copy', 'document-selection-outside'],
  textSelectionIds: ['document-selection-copy'],
  interactionEventTypes: [],
  enforcedStyleProperties: {
    'document-selection-copy': [
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
      'borderRadius', 'cursor',
    ],
  },
  interactionSteps: [
    {
      id: 'select-forward',
      actions: [
        { type: 'pointer-down', elementId: 'document-selection-copy', offsetX: 22, offsetY: 36 },
        { type: 'hover', elementId: 'document-selection-copy', offsetX: 166, offsetY: 36 },
        { type: 'pointer-up' },
      ],
    },
    {
      id: 'clear-forward-selection',
      actions: [{ type: 'click', elementId: 'document-selection-outside' }],
    },
    {
      id: 'select-backward',
      actions: [
        { type: 'pointer-down', elementId: 'document-selection-copy', offsetX: 166, offsetY: 36 },
        { type: 'hover', elementId: 'document-selection-copy', offsetX: 46, offsetY: 36 },
        { type: 'pointer-up' },
      ],
    },
    {
      id: 'clear-backward-selection',
      actions: [{ type: 'click', elementId: 'document-selection-outside' }],
    },
  ],
  reference: {
    html: `
      <p id="document-selection-copy">Selectable browser text keeps its direction.</p>
      <div id="document-selection-outside"></div>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; font-family:Arial,sans-serif; }
      #document-selection-copy { box-sizing:border-box; position:absolute; left:120px; top:190px; width:560px; height:72px; margin:0; padding:18px 20px; border:3px solid #1e3a8a; border-radius:10px; background:#fff; color:#0f172a; cursor:text; font:400 20px/30px Arial,sans-serif; white-space:nowrap; }
      #document-selection-outside { box-sizing:border-box; position:absolute; left:300px; top:340px; width:200px; height:80px; background:#bfdbfe; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eff6ff', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#document-selection-copy', boxSizing: 'border-box', position: 'absolute',
        left: '120px', top: '190px', width: '560px', height: '72px', margin: '0',
        padding: '18px 20px', borderWidth: '3px', borderStyle: 'solid',
        borderColor: '#1e3a8a', borderRadius: '10px', background: '#ffffff',
        color: '#0f172a', cursor: 'text', fontFamily: 'Arial, sans-serif',
        fontSize: '20px', fontWeight: '400', lineHeight: '30px', whiteSpace: 'nowrap',
      },
      {
        selector: '#document-selection-outside', boxSizing: 'border-box', position: 'absolute',
        left: '300px', top: '340px', width: '200px', height: '80px', background: '#bfdbfe',
      },
    ],
    root: {
      children: [
        {
          type: 'p', id: 'document-selection-copy',
          textContent: 'Selectable browser text keeps its direction.',
        },
        { type: 'div', id: 'document-selection-outside' },
      ],
    },
  },
};
