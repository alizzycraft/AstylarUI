import type { ParityFixture } from '../parity.types';

export const interactionFormSubmitFixture: ParityFixture = {
  id: 'interaction-form-submit',
  title: 'Form submission default action',
  category: 'forms-interactive',
  expectedBehavior:
    'Pointer and Enter activation of a submit button emit click then submit on its containing form after edited text commits.',
  measurementIds: ['form-submit-surface', 'form-submit-text', 'form-submit-button'],
  interactionIds: ['form-submit-form', 'form-submit-text', 'form-submit-button'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup',
    'input', 'change', 'submit',
  ],
  interactionSteps: [
    { id: 'focus-text', actions: [{ type: 'click', elementId: 'form-submit-text' }] },
    { id: 'edit-text', actions: [{ type: 'press-key', key: 'End' }, { type: 'type-text', text: 'X' }] },
    { id: 'pointer-submit', actions: [{ type: 'click', elementId: 'form-submit-button' }] },
    { id: 'keyboard-submit', actions: [{ type: 'press-key', key: 'Enter' }] },
  ],
  reference: {
    html: `
      <section id="form-submit-surface">
        <form id="form-submit-form">
          <input id="form-submit-text" name="title" type="text" value="Seed">
          <input id="form-submit-button" type="submit" value="Save">
        </form>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #form-submit-surface { box-sizing:border-box; position:absolute; left:150px; top:150px; width:500px; height:220px; padding:50px; background:#e2e8f0; }
      #form-submit-form { box-sizing:border-box; position:relative; width:400px; height:120px; margin:0; padding:0; }
      #form-submit-text, #form-submit-button { appearance:none; box-sizing:border-box; position:absolute; top:28px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#ffffff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #form-submit-text { left:0; width:240px; }
      #form-submit-button { left:274px; width:126px; background:#bfdbfe; font-weight:700; text-align:center; }
      #form-submit-text:focus, #form-submit-button:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#form-submit-surface', boxSizing: 'border-box', position: 'absolute',
        left: '150px', top: '150px', width: '500px', height: '220px', padding: '50px',
        background: '#e2e8f0',
      },
      {
        selector: '#form-submit-form', boxSizing: 'border-box', position: 'relative',
        width: '400px', height: '120px', margin: '0', padding: '0',
      },
      {
        selector: '.form-submit-field', boxSizing: 'border-box', position: 'absolute', top: '28px',
        height: '56px', margin: '0', padding: '12px 14px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '0', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '28px',
      },
      { selector: '#form-submit-text', left: '0', width: '240px' },
      {
        selector: '#form-submit-button', left: '274px', width: '126px', background: '#bfdbfe',
        fontWeight: '700', textAlign: 'center',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'form-submit-surface', children: [{
          type: 'form', id: 'form-submit-form', children: [
            {
              type: 'input', inputType: 'text', id: 'form-submit-text', name: 'title',
              class: 'form-submit-field', value: 'Seed',
            },
            {
              type: 'input', inputType: 'submit', id: 'form-submit-button',
              class: 'form-submit-field', value: 'Save',
            },
          ],
        }],
      }],
    },
  },
};
