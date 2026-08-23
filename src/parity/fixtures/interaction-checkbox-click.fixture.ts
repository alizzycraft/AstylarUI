import type { ParityFixture } from '../parity.types';

export const interactionCheckboxClickFixture: ParityFixture = {
  id: 'interaction-checkbox-click',
  title: 'Checkbox pointer activation',
  category: 'forms-interactive',
  expectedBehavior:
    'Each primary-pointer click toggles a checkbox before click listeners run, then emits input and change with the new checked state.',
  measurementIds: ['checkbox-surface', 'checkbox-field'],
  interactionIds: ['checkbox-field'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'input', 'change'],
  interactionSteps: [
    { id: 'check', actions: [{ type: 'click', elementId: 'checkbox-field' }] },
    { id: 'uncheck', actions: [{ type: 'click', elementId: 'checkbox-field' }] },
  ],
  reference: {
    html: `
      <section id="checkbox-surface">
        <input id="checkbox-field" type="checkbox" aria-label="Enable alerts">
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #checkbox-surface { box-sizing:border-box; position:absolute; left:280px; top:180px; width:240px; height:160px; padding:60px 100px; background:#e2e8f0; }
      #checkbox-field { appearance:none; box-sizing:border-box; display:block; width:32px; height:28px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:5px; background:#2563eb; }
      #checkbox-field:checked::after { content:''; display:block; width:19.2px; height:19.6px; margin:2.2px 4.4px; background:#ffffff; }
      #checkbox-field:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#checkbox-surface', boxSizing: 'border-box', position: 'absolute', left: '280px',
        top: '180px', width: '240px', height: '160px', padding: '60px 100px', background: '#e2e8f0',
      },
      {
        selector: '#checkbox-field', boxSizing: 'border-box', display: 'block', width: '32px',
        height: '28px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid',
        borderColor: '#1e3a8a', borderRadius: '5px', background: '#2563eb',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'checkbox-surface', children: [
          { type: 'input', inputType: 'checkbox', id: 'checkbox-field', checked: false },
        ],
      }],
    },
  },
};
