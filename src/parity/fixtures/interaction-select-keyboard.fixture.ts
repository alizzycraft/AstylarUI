import type { ParityFixture } from '../parity.types';

export const interactionSelectKeyboardFixture: ParityFixture = {
  id: 'interaction-select-keyboard',
  title: 'Closed select keyboard selection',
  category: 'forms-interactive',
  expectedBehavior:
    'Arrow keys change a focused closed select immediately, skip disabled options, update its displayed value, and emit input then change before keyup.',
  measurementIds: ['select-keyboard-surface', 'select-keyboard-sentinel', 'select-keyboard-control'],
  interactionIds: ['select-keyboard-sentinel', 'select-keyboard-control'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur',
    'keydown', 'keyup', 'input', 'change',
  ],
  interactionSteps: [
    { id: 'focus-sentinel', actions: [{ type: 'click', elementId: 'select-keyboard-sentinel' }] },
    { id: 'tab-to-select', actions: [{ type: 'press-key', key: 'Tab' }] },
    { id: 'arrow-down-skips-disabled', actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    { id: 'arrow-down-to-last', actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    { id: 'arrow-up', actions: [{ type: 'press-key', key: 'ArrowUp' }] },
  ],
  reference: {
    html: `
      <section id="select-keyboard-surface">
        <input id="select-keyboard-sentinel" type="button" value="Start">
        <select id="select-keyboard-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="blocked" disabled>Blocked option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
        </select>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #select-keyboard-surface { box-sizing:border-box; position:absolute; left:190px; top:170px; width:420px; height:180px; padding:54px 40px; background:#e2e8f0; }
      #select-keyboard-sentinel, #select-keyboard-control { appearance:none; box-sizing:border-box; position:absolute; top:62px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#ffffff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #select-keyboard-sentinel { left:40px; width:100px; text-align:center; }
      #select-keyboard-control { left:160px; width:220px; }
      #select-keyboard-sentinel:focus, #select-keyboard-control:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#select-keyboard-surface', boxSizing: 'border-box', position: 'absolute',
        left: '190px', top: '170px', width: '420px', height: '180px', padding: '54px 40px',
        background: '#e2e8f0',
      },
      {
        selector: '.select-keyboard-control', boxSizing: 'border-box', position: 'absolute',
        top: '62px', height: '56px', margin: '0', padding: '12px 14px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '0', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '28px',
      },
      { selector: '#select-keyboard-sentinel', left: '40px', width: '100px', textAlign: 'center' },
      { selector: '#select-keyboard-control', left: '160px', width: '220px' },
    ],
    root: {
      children: [{
        type: 'section', id: 'select-keyboard-surface', children: [
          {
            type: 'input', inputType: 'button', id: 'select-keyboard-sentinel',
            class: 'select-keyboard-control', value: 'Start',
          },
          {
            type: 'select', id: 'select-keyboard-control', class: 'select-keyboard-control',
            value: 'alpha', options: [
              { value: 'alpha', label: 'Alpha option' },
              { value: 'blocked', label: 'Blocked option', disabled: true },
              { value: 'beta', label: 'Beta option' },
              { value: 'gamma', label: 'Gamma option' },
            ],
          },
        ],
      }],
    },
  },
};
