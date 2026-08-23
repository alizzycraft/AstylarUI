import type { ParityFixture } from '../parity.types';

export const interactionLabelControlFixture: ParityFixture = {
  id: 'interaction-label-control',
  title: 'Explicit label control activation',
  category: 'forms-interactive',
  expectedBehavior:
    'Clicking an explicit label focuses and activates its associated checkbox through a synthesized control click with normal input and change events.',
  measurementIds: ['label-control-surface', 'label-control-checkbox', 'label-control-label'],
  interactionIds: ['label-control-checkbox', 'label-control-label'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'input', 'change',
  ],
  interactionSteps: [
    { id: 'label-checks', actions: [{ type: 'click', elementId: 'label-control-label' }] },
    { id: 'label-unchecks', actions: [{ type: 'click', elementId: 'label-control-label' }] },
  ],
  reference: {
    html: `
      <section id="label-control-surface">
        <input id="label-control-checkbox" type="checkbox" value="alerts">
        <label id="label-control-label" for="label-control-checkbox">Enable alerts</label>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #label-control-surface { box-sizing:border-box; position:absolute; left:210px; top:180px; width:380px; height:160px; padding:58px 54px; background:#e2e8f0; }
      #label-control-checkbox { appearance:none; box-sizing:border-box; position:absolute; left:54px; top:62px; width:36px; height:36px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:5px; outline:0; background:#ffffff; }
      #label-control-checkbox:checked::after { content:''; display:block; width:22px; height:22px; margin:5px; border-radius:2px; background:#315fa5; }
      #label-control-checkbox:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #label-control-label { box-sizing:border-box; position:absolute; left:110px; top:58px; width:210px; height:44px; margin:0; padding:8px 0; color:#172554; font:700 16px/28px Arial,sans-serif; cursor:pointer; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#label-control-surface', boxSizing: 'border-box', position: 'absolute',
        left: '210px', top: '180px', width: '380px', height: '160px', padding: '58px 54px',
        background: '#e2e8f0',
      },
      {
        selector: '#label-control-checkbox', boxSizing: 'border-box', position: 'absolute',
        left: '54px', top: '62px', width: '36px', height: '36px', margin: '0', padding: '0',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '5px',
        background: '#ffffff',
      },
      {
        selector: '#label-control-label', boxSizing: 'border-box', position: 'absolute',
        left: '110px', top: '58px', width: '210px', height: '44px', margin: '0', padding: '8px 0',
        color: '#172554', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700',
        lineHeight: '28px', cursor: 'pointer',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'label-control-surface', children: [
          {
            type: 'input', inputType: 'checkbox', id: 'label-control-checkbox',
            value: 'alerts', checked: false,
          },
          {
            type: 'label', id: 'label-control-label', for: 'label-control-checkbox',
            textContent: 'Enable alerts',
          },
        ],
      }],
    },
  },
};
