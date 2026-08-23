import type { ParityFixture } from '../parity.types';

export const interactionPointerClickFixture: ParityFixture = {
  id: 'interaction-pointer-click',
  title: 'Pointer activation event order',
  category: 'forms-interactive',
  expectedBehavior:
    'A real primary-pointer activation targets the authored button and reports pointerdown, pointerup, and click once in browser order.',
  measurementIds: ['interaction-surface', 'interaction-button', 'interaction-status'],
  interactionIds: ['interaction-button'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click'],
  interactionSteps: [{
    id: 'primary-click',
    actions: [{ type: 'click', elementId: 'interaction-button' }],
  }],
  reference: {
    html: `
      <section id="interaction-surface">
        <input id="interaction-button" type="button" value="Activate">
        <p id="interaction-status">Ready</p>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #interaction-surface { box-sizing:border-box; position:absolute; left:180px; top:120px; width:440px; height:180px; padding:28px; background:#e2e8f0; }
      #interaction-button { appearance:none; box-sizing:border-box; width:180px; height:56px; margin:0; padding:12px 20px; border:2px solid #1d4ed8; border-radius:8px; background:#2563eb; color:#fff; font:700 16px/24px Arial,sans-serif; text-align:center; cursor:pointer; }
      #interaction-status { box-sizing:border-box; width:180px; height:40px; margin:16px 0 0; padding:8px; background:#fff; color:#0f172a; font:400 14px/24px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#interaction-surface', boxSizing: 'border-box', position: 'absolute',
        left: '180px', top: '120px', width: '440px', height: '180px', padding: '28px',
        background: '#e2e8f0',
      },
      {
        selector: '#interaction-button', boxSizing: 'border-box', width: '180px', height: '56px',
        margin: '0', padding: '12px 20px', borderWidth: '2px', borderStyle: 'solid',
        borderColor: '#1d4ed8', borderRadius: '8px', background: '#2563eb', color: '#ffffff',
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px',
        textAlign: 'center', cursor: 'pointer',
      },
      {
        selector: '#interaction-status', boxSizing: 'border-box', width: '180px', height: '40px',
        margin: '16px 0 0', padding: '8px', background: '#ffffff', color: '#0f172a',
        fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '24px',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'interaction-surface', children: [
          { type: 'input', inputType: 'button', id: 'interaction-button', value: 'Activate' },
          { type: 'p', id: 'interaction-status', textContent: 'Ready' },
        ],
      }],
    },
  },
};
