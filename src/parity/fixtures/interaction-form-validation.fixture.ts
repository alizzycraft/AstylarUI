import type { ParityFixture } from '../parity.types';

export const interactionFormValidationFixture: ParityFixture = {
  id: 'interaction-form-validation',
  title: 'Required-field submission validation',
  category: 'forms-interactive',
  expectedBehavior:
    'Submitting an empty required field emits invalid and focuses it without submit; after entry, the same button emits submit.',
  measurementIds: ['form-validation-surface', 'form-validation-text', 'form-validation-button'],
  interactionIds: ['form-validation-form', 'form-validation-text', 'form-validation-button'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup',
    'input', 'change', 'invalid', 'submit',
  ],
  interactionSteps: [
    { id: 'invalid-submit', actions: [{ type: 'click', elementId: 'form-validation-button' }] },
    { id: 'enter-value', actions: [{ type: 'type-text', text: 'Ready' }] },
    { id: 'valid-submit', actions: [{ type: 'click', elementId: 'form-validation-button' }] },
  ],
  reference: {
    html: `
      <section id="form-validation-surface">
        <form id="form-validation-form">
          <input id="form-validation-text" name="title" type="text" value="" required>
          <input id="form-validation-button" type="submit" value="Save">
        </form>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #form-validation-surface { box-sizing:border-box; position:absolute; left:150px; top:150px; width:500px; height:220px; padding:50px; background:#e2e8f0; }
      #form-validation-form { box-sizing:border-box; position:relative; width:400px; height:120px; margin:0; padding:0; }
      #form-validation-text, #form-validation-button { appearance:none; box-sizing:border-box; position:absolute; top:28px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#ffffff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #form-validation-text { left:0; width:240px; }
      #form-validation-button { left:274px; width:126px; background:#bfdbfe; font-weight:700; text-align:center; }
      #form-validation-text:focus, #form-validation-button:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#form-validation-surface', boxSizing: 'border-box', position: 'absolute',
        left: '150px', top: '150px', width: '500px', height: '220px', padding: '50px',
        background: '#e2e8f0',
      },
      {
        selector: '#form-validation-form', boxSizing: 'border-box', position: 'relative',
        width: '400px', height: '120px', margin: '0', padding: '0',
      },
      {
        selector: '.form-validation-field', boxSizing: 'border-box', position: 'absolute', top: '28px',
        height: '56px', margin: '0', padding: '12px 14px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '0', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '28px',
      },
      { selector: '#form-validation-text', left: '0', width: '240px' },
      {
        selector: '#form-validation-button', left: '274px', width: '126px', background: '#bfdbfe',
        fontWeight: '700', textAlign: 'center',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'form-validation-surface', children: [{
          type: 'form', id: 'form-validation-form', children: [
            {
              type: 'input', inputType: 'text', id: 'form-validation-text', name: 'title',
              class: 'form-validation-field', value: '', required: true,
            },
            {
              type: 'input', inputType: 'submit', id: 'form-validation-button',
              class: 'form-validation-field', value: 'Save',
            },
          ],
        }],
      }],
    },
  },
};
