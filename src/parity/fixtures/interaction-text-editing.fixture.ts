import type { ParityFixture } from '../parity.types';

export const interactionTextEditingFixture: ParityFixture = {
  id: 'interaction-text-editing',
  title: 'Text input editing events',
  category: 'forms-interactive',
  expectedBehavior:
    'Typing and deleting in a focused text input updates value and selection, emits input after each mutation, and commits change when focus leaves the control.',
  measurementIds: ['edit-surface', 'edit-field', 'edit-outside'],
  interactionIds: ['edit-field'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'input', 'change'],
  interactionSteps: [
    {
      id: 'focus-at-end',
      actions: [
        { type: 'click', elementId: 'edit-field' },
        { type: 'press-key', key: 'End' },
      ],
    },
    { id: 'type-characters', actions: [{ type: 'type-text', text: '-42' }] },
    { id: 'delete-character', actions: [{ type: 'press-key', key: 'Backspace' }] },
    { id: 'blur-commits-change', actions: [{ type: 'click', elementId: 'edit-outside' }] },
  ],
  reference: {
    html: `
      <section id="edit-surface">
        <input id="edit-field" type="text" value="Seed">
        <div id="edit-outside">Commit target</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #edit-surface { box-sizing:border-box; position:absolute; left:150px; top:130px; width:500px; height:220px; padding:30px; background:#e2e8f0; }
      #edit-field { appearance:none; box-sizing:border-box; display:block; width:320px; height:54px; margin:0 0 20px; padding:12px 16px; border:2px solid #334155; border-radius:6px; background:#fff; color:#0f172a; font:400 16px/26px Arial,sans-serif; }
      #edit-field:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #edit-outside { box-sizing:border-box; width:320px; height:64px; padding:17px 16px; background:#cbd5e1; color:#334155; font:400 14px/30px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#edit-surface', boxSizing: 'border-box', position: 'absolute', left: '150px',
        top: '130px', width: '500px', height: '220px', padding: '30px', background: '#e2e8f0',
      },
      {
        selector: '#edit-field', boxSizing: 'border-box', display: 'block', width: '320px',
        height: '54px', margin: '0 0 20px', padding: '12px 16px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '6px', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '26px',
      },
      {
        selector: '#edit-outside', boxSizing: 'border-box', width: '320px', height: '64px',
        padding: '17px 16px', background: '#cbd5e1', color: '#334155',
        fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '30px',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'edit-surface', children: [
          { type: 'input', inputType: 'text', id: 'edit-field', value: 'Seed' },
          { type: 'div', id: 'edit-outside', textContent: 'Commit target' },
        ],
      }],
    },
  },
};
