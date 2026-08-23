import type { ParityFixture } from '../parity.types';

export const interactionRadioGroupFixture: ParityFixture = {
  id: 'interaction-radio-group',
  title: 'Radio group pointer activation',
  category: 'forms-interactive',
  expectedBehavior:
    'Clicking a different radio selects it and clears its group peer before click, while clicking the selected radio again emits no input or change.',
  measurementIds: ['radio-surface', 'radio-alpha', 'radio-beta'],
  interactionIds: ['radio-alpha', 'radio-beta'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'input', 'change'],
  interactionSteps: [
    { id: 'select-beta', actions: [{ type: 'click', elementId: 'radio-beta' }] },
    { id: 'repeat-beta', actions: [{ type: 'click', elementId: 'radio-beta' }] },
    { id: 'select-alpha', actions: [{ type: 'click', elementId: 'radio-alpha' }] },
  ],
  reference: {
    html: `
      <section id="radio-surface">
        <input id="radio-alpha" name="channel" type="radio" value="alpha" checked aria-label="Alpha">
        <input id="radio-beta" name="channel" type="radio" value="beta" aria-label="Beta">
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #radio-surface { box-sizing:border-box; position:absolute; left:260px; top:180px; width:280px; height:160px; padding:60px 80px; background:#e2e8f0; }
      #radio-alpha, #radio-beta { appearance:none; box-sizing:border-box; position:absolute; top:64px; width:32px; height:32px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:50%; background:#ffffff; }
      #radio-alpha { left:80px; }
      #radio-beta { left:168px; }
      #radio-alpha:checked::after, #radio-beta:checked::after { content:''; display:block; width:19.2px; height:19.2px; margin:4.4px; border-radius:50%; background:#315fa5; }
      #radio-alpha:focus, #radio-beta:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#radio-surface', boxSizing: 'border-box', position: 'absolute', left: '260px',
        top: '180px', width: '280px', height: '160px', padding: '60px 80px', background: '#e2e8f0',
      },
      {
        selector: '#radio-alpha', boxSizing: 'border-box', position: 'absolute', left: '80px', top: '64px',
        width: '32px', height: '32px', margin: '0', padding: '0', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '50%', background: '#ffffff',
      },
      {
        selector: '#radio-beta', boxSizing: 'border-box', position: 'absolute', left: '168px', top: '64px',
        width: '32px', height: '32px', margin: '0', padding: '0', borderWidth: '2px',
        borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '50%', background: '#ffffff',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'radio-surface', children: [
          { type: 'input', inputType: 'radio', id: 'radio-alpha', name: 'channel', value: 'alpha', checked: true },
          { type: 'input', inputType: 'radio', id: 'radio-beta', name: 'channel', value: 'beta', checked: false },
        ],
      }],
    },
  },
};
