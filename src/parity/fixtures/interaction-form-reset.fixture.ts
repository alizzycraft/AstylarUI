import type { ParityFixture } from '../parity.types';

export const interactionFormResetFixture: ParityFixture = {
  id: 'interaction-form-reset',
  title: 'Form reset default action',
  category: 'forms-interactive',
  expectedBehavior:
    'A reset button emits click then reset and restores authored text and checked defaults without input or change events for the restored values.',
  measurementIds: [
    'form-reset-surface', 'form-reset-text', 'form-reset-checkbox', 'form-reset-button',
  ],
  interactionIds: [
    'form-reset-form', 'form-reset-text', 'form-reset-checkbox', 'form-reset-button',
  ],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup',
    'input', 'change', 'reset',
  ],
  interactionSteps: [
    { id: 'focus-text', actions: [{ type: 'click', elementId: 'form-reset-text' }] },
    { id: 'edit-text', actions: [{ type: 'press-key', key: 'End' }, { type: 'type-text', text: 'X' }] },
    { id: 'uncheck', actions: [{ type: 'click', elementId: 'form-reset-checkbox' }] },
    { id: 'reset', actions: [{ type: 'click', elementId: 'form-reset-button' }] },
  ],
  reference: {
    html: `
      <section id="form-reset-surface">
        <form id="form-reset-form">
          <input id="form-reset-text" name="title" type="text" value="Seed">
          <input id="form-reset-checkbox" name="alerts" type="checkbox" value="yes" checked>
          <input id="form-reset-button" type="reset" value="Reset">
        </form>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #form-reset-surface { box-sizing:border-box; position:absolute; left:150px; top:150px; width:500px; height:220px; padding:50px; background:#e2e8f0; }
      #form-reset-form { box-sizing:border-box; position:relative; width:400px; height:120px; margin:0; padding:0; }
      #form-reset-text, #form-reset-button { appearance:none; box-sizing:border-box; position:absolute; top:28px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#ffffff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #form-reset-text { left:0; width:190px; }
      #form-reset-checkbox { appearance:none; box-sizing:border-box; position:absolute; left:214px; top:38px; width:36px; height:36px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:5px; outline:0; background:#ffffff; }
      #form-reset-checkbox:checked::after { content:''; display:block; width:22px; height:22px; margin:5px; border-radius:2px; background:#315fa5; }
      #form-reset-button { left:274px; width:126px; background:#dbeafe; font-weight:700; text-align:center; }
      #form-reset-text:focus, #form-reset-checkbox:focus, #form-reset-button:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#form-reset-surface', boxSizing: 'border-box', position: 'absolute',
        left: '150px', top: '150px', width: '500px', height: '220px', padding: '50px',
        background: '#e2e8f0',
      },
      {
        selector: '#form-reset-form', boxSizing: 'border-box', position: 'relative',
        width: '400px', height: '120px', margin: '0', padding: '0',
      },
      {
        selector: '.form-reset-field', boxSizing: 'border-box', position: 'absolute', top: '28px',
        height: '56px', margin: '0', padding: '12px 14px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '0', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '28px',
      },
      { selector: '#form-reset-text', left: '0', width: '190px' },
      {
        selector: '#form-reset-checkbox', boxSizing: 'border-box', position: 'absolute',
        left: '214px', top: '38px', width: '36px', height: '36px', margin: '0', padding: '0',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '5px',
        background: '#ffffff',
      },
      {
        selector: '#form-reset-button', left: '274px', width: '126px', background: '#dbeafe',
        fontWeight: '700', textAlign: 'center',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'form-reset-surface', children: [{
          type: 'form', id: 'form-reset-form', children: [
            {
              type: 'input', inputType: 'text', id: 'form-reset-text', name: 'title',
              class: 'form-reset-field', value: 'Seed',
            },
            {
              type: 'input', inputType: 'checkbox', id: 'form-reset-checkbox', name: 'alerts',
              value: 'yes', checked: true,
            },
            {
              type: 'input', inputType: 'reset', id: 'form-reset-button',
              class: 'form-reset-field', value: 'Reset',
            },
          ],
        }],
      }],
    },
  },
};
