import type { ParityFixture } from '../parity.types';

export const interactionCheckboxKeyboardFixture: ParityFixture = {
  id: 'interaction-checkbox-keyboard',
  title: 'Checkbox Space-key activation',
  category: 'forms-interactive',
  expectedBehavior:
    'Space on a focused checkbox reports keydown and keyup before a synthesized click, then emits input and change with the toggled checked state.',
  measurementIds: ['keyboard-checkbox-surface', 'keyboard-checkbox'],
  interactionIds: ['keyboard-checkbox'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'keydown', 'keyup', 'input', 'change'],
  interactionSteps: [
    { id: 'pointer-focus-and-check', actions: [{ type: 'click', elementId: 'keyboard-checkbox' }] },
    { id: 'space-unchecks', actions: [{ type: 'press-key', key: 'Space' }] },
  ],
  reference: {
    html: `
      <section id="keyboard-checkbox-surface">
        <input id="keyboard-checkbox" type="checkbox" aria-label="Keyboard option">
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #keyboard-checkbox-surface { box-sizing:border-box; position:absolute; left:280px; top:180px; width:240px; height:160px; padding:60px 100px; background:#e2e8f0; }
      #keyboard-checkbox { appearance:none; box-sizing:border-box; display:block; width:32px; height:28px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:5px; background:#2563eb; }
      #keyboard-checkbox:checked::after { content:''; display:block; width:19.2px; height:19.6px; margin:2.2px 4.4px; background:#ffffff; }
      #keyboard-checkbox:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#keyboard-checkbox-surface', boxSizing: 'border-box', position: 'absolute',
        left: '280px', top: '180px', width: '240px', height: '160px', padding: '60px 100px',
        background: '#e2e8f0',
      },
      {
        selector: '#keyboard-checkbox', boxSizing: 'border-box', display: 'block', width: '32px',
        height: '28px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid',
        borderColor: '#1e3a8a', borderRadius: '5px', background: '#2563eb',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'keyboard-checkbox-surface', children: [
          { type: 'input', inputType: 'checkbox', id: 'keyboard-checkbox', checked: false },
        ],
      }],
    },
  },
};
