import type { ParityFixture } from '../parity.types';

export const interactionTextareaSelectionFixture: ParityFixture = {
  id: 'interaction-textarea-selection',
  title: 'Textarea selection and multiline editing',
  category: 'forms-interactive',
  expectedBehavior:
    'Shift-arrow selection, selection replacement, newline insertion, continued multiline typing, and blur commit match a browser textarea.',
  measurementIds: ['textarea-surface', 'textarea-field', 'textarea-outside'],
  interactionIds: ['textarea-field'],
  enforcePointerCursor: true,
  controlVisualStateIds: ['textarea-field'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'input', 'change'],
  interactionSteps: [
    {
      id: 'select-last-two',
      actions: [
        { type: 'click', elementId: 'textarea-field' },
        { type: 'press-key', key: 'End' },
        { type: 'press-key', key: 'Shift+ArrowLeft' },
        { type: 'press-key', key: 'Shift+ArrowLeft' },
      ],
    },
    { id: 'replace-selection', actions: [{ type: 'type-text', text: 'XY' }] },
    { id: 'insert-newline', actions: [{ type: 'press-key', key: 'Enter' }] },
    { id: 'type-second-line', actions: [{ type: 'type-text', text: 'Beta' }] },
    { id: 'commit-on-blur', actions: [{ type: 'click', elementId: 'textarea-outside' }] },
  ],
  reference: {
    html: `
      <section id="textarea-surface">
        <textarea id="textarea-field">Alpha</textarea>
        <div id="textarea-outside">Commit target</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #textarea-surface { box-sizing:border-box; position:absolute; left:150px; top:100px; width:500px; height:300px; padding:30px; background:#e2e8f0; }
      #textarea-field { appearance:none; box-sizing:border-box; display:block; resize:none; width:340px; height:120px; margin:0 0 20px; padding:12px 16px; border:2px solid #334155; border-radius:6px; background:#fff; color:#0f172a; font:400 16px/26px Arial,sans-serif; white-space:pre-wrap; }
      #textarea-field:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #textarea-outside { box-sizing:border-box; width:340px; height:64px; padding:17px 16px; background:#cbd5e1; color:#334155; font:400 14px/30px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#textarea-surface', boxSizing: 'border-box', position: 'absolute', left: '150px',
        top: '100px', width: '500px', height: '300px', padding: '30px', background: '#e2e8f0',
      },
      {
        selector: '#textarea-field', boxSizing: 'border-box', display: 'block', width: '340px',
        height: '120px', margin: '0 0 20px', padding: '12px 16px', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#334155', borderRadius: '6px', background: '#ffffff',
        color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
        lineHeight: '26px', whiteSpace: 'pre-wrap',
      },
      {
        selector: '#textarea-outside', boxSizing: 'border-box', width: '340px', height: '64px',
        padding: '17px 16px', background: '#cbd5e1', color: '#334155',
        fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '30px',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'textarea-surface', children: [
          { type: 'textarea', id: 'textarea-field', value: 'Alpha' },
          { type: 'div', id: 'textarea-outside', textContent: 'Commit target' },
        ],
      }],
    },
  },
};
