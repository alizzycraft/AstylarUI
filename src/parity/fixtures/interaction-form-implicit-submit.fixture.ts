import type { ParityFixture } from '../parity.types';

export const interactionFormImplicitSubmitFixture: ParityFixture = {
  id: 'interaction-form-implicit-submit',
  title: 'Single-line implicit form submission',
  category: 'forms-interactive',
  expectedBehavior:
    'Enter in a focused single-line field synthesizes the form submit button click and submit while retaining field focus.',
  measurementIds: ['implicit-submit-surface', 'implicit-submit-text', 'implicit-submit-button'],
  interactionIds: ['implicit-submit-form', 'implicit-submit-text', 'implicit-submit-button'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup', 'submit',
  ],
  interactionSteps: [
    { id: 'focus-text', actions: [{ type: 'click', elementId: 'implicit-submit-text' }] },
    { id: 'press-enter', actions: [{ type: 'press-key', key: 'Enter' }] },
  ],
  reference: {
    html: `
      <section id="implicit-submit-surface">
        <form id="implicit-submit-form">
          <input id="implicit-submit-text" name="query" type="text" value="Ready">
          <input id="implicit-submit-button" type="submit" value="Go">
        </form>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #implicit-submit-surface { box-sizing:border-box; position:absolute; left:150px; top:150px; width:500px; height:220px; padding:50px; background:#e2e8f0; }
      #implicit-submit-form { box-sizing:border-box; position:relative; width:400px; height:120px; margin:0; padding:0; }
      #implicit-submit-text, #implicit-submit-button { appearance:none; box-sizing:border-box; position:absolute; top:28px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#ffffff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #implicit-submit-text { left:0; width:240px; }
      #implicit-submit-button { left:274px; width:126px; background:#bfdbfe; font-weight:700; text-align:center; }
      #implicit-submit-text:focus, #implicit-submit-button:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#implicit-submit-surface', boxSizing: 'border-box', position: 'absolute',
        left: '150px', top: '150px', width: '500px', height: '220px', padding: '50px',
        background: '#e2e8f0',
      },
      {
        selector: '#implicit-submit-form', boxSizing: 'border-box', position: 'relative',
        width: '400px', height: '120px', margin: '0', padding: '0',
      },
      {
        selector: '.implicit-submit-field', boxSizing: 'border-box', position: 'absolute', top: '28px',
        height: '56px', margin: '0', padding: '12px 14px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '0', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '28px',
      },
      { selector: '#implicit-submit-text', left: '0', width: '240px' },
      {
        selector: '#implicit-submit-button', left: '274px', width: '126px', background: '#bfdbfe',
        fontWeight: '700', textAlign: 'center',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'implicit-submit-surface', children: [{
          type: 'form', id: 'implicit-submit-form', children: [
            {
              type: 'input', inputType: 'text', id: 'implicit-submit-text', name: 'query',
              class: 'implicit-submit-field', value: 'Ready',
            },
            {
              type: 'input', inputType: 'submit', id: 'implicit-submit-button',
              class: 'implicit-submit-field', value: 'Go',
            },
          ],
        }],
      }],
    },
  },
};
