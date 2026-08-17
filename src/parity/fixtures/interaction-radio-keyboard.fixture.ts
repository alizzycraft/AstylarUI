import type { ParityFixture } from '../parity.types';

export const interactionRadioKeyboardFixture: ParityFixture = {
  id: 'interaction-radio-keyboard',
  title: 'Radio group arrow-key navigation',
  category: 'forms-interactive',
  expectedBehavior:
    'Arrow keys move focus and exclusive selection within a named radio group, emitting input and change on the newly selected member before keyup.',
  measurementIds: ['radio-keyboard-surface', 'radio-keyboard-alpha', 'radio-keyboard-beta'],
  interactionIds: ['radio-keyboard-alpha', 'radio-keyboard-beta'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup', 'input', 'change'],
  interactionSteps: [
    { id: 'focus-alpha', actions: [{ type: 'click', elementId: 'radio-keyboard-alpha' }] },
    { id: 'arrow-right', actions: [{ type: 'press-key', key: 'ArrowRight' }] },
    { id: 'arrow-left', actions: [{ type: 'press-key', key: 'ArrowLeft' }] },
  ],
  reference: {
    html: `
      <section id="radio-keyboard-surface">
        <input id="radio-keyboard-alpha" name="keyboard-channel" type="radio" value="alpha" checked aria-label="Alpha">
        <input id="radio-keyboard-beta" name="keyboard-channel" type="radio" value="beta" aria-label="Beta">
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #radio-keyboard-surface { box-sizing:border-box; position:absolute; left:260px; top:180px; width:280px; height:160px; padding:60px 80px; background:#e2e8f0; }
      #radio-keyboard-alpha, #radio-keyboard-beta { appearance:none; box-sizing:border-box; position:absolute; top:64px; width:32px; height:32px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:50%; background:#ffffff; }
      #radio-keyboard-alpha { left:80px; }
      #radio-keyboard-beta { left:168px; }
      #radio-keyboard-alpha:checked::after, #radio-keyboard-beta:checked::after { content:''; display:block; width:19.2px; height:19.2px; margin:4.4px; border-radius:50%; background:#315fa5; }
      #radio-keyboard-alpha:focus, #radio-keyboard-beta:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#radio-keyboard-surface', boxSizing: 'border-box', position: 'absolute',
        left: '260px', top: '180px', width: '280px', height: '160px', padding: '60px 80px',
        background: '#e2e8f0',
      },
      {
        selector: '#radio-keyboard-alpha', boxSizing: 'border-box', position: 'absolute',
        left: '80px', top: '64px', width: '32px', height: '32px', margin: '0', padding: '0',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '50%',
        background: '#ffffff',
      },
      {
        selector: '#radio-keyboard-beta', boxSizing: 'border-box', position: 'absolute',
        left: '168px', top: '64px', width: '32px', height: '32px', margin: '0', padding: '0',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '50%',
        background: '#ffffff',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'radio-keyboard-surface', children: [
          { type: 'input', inputType: 'radio', id: 'radio-keyboard-alpha', name: 'keyboard-channel', value: 'alpha', checked: true },
          { type: 'input', inputType: 'radio', id: 'radio-keyboard-beta', name: 'keyboard-channel', value: 'beta', checked: false },
        ],
      }],
    },
  },
};
