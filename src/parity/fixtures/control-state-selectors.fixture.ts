import { ParityFixture } from '../parity.types';

export const controlStateSelectorsFixture: ParityFixture = {
  id: 'control-state-selectors',
  title: 'Semantic control state selectors',
  category: 'controls-states',
  expectedBehavior:
    'Enabled, disabled, and checked pseudo-classes match semantic control state and participate in the normal cascade.',
  measurementIds: ['state-enabled', 'state-disabled', 'state-checked'],
  reference: {
    html: `
      <input id="state-enabled" class="state-button" type="button" value="Enabled">
      <input id="state-disabled" class="state-button" type="button" value="Disabled" disabled>
      <input id="state-checked" type="checkbox" checked aria-label="Checked">
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      .state-button { appearance: none; box-sizing: border-box; position: absolute; top: 110px; width: 180px; height: 64px; margin: 0; padding: 16px; border: 0; background: #fee2e2; color: #7f1d1d; font: 700 16px/24px Arial, sans-serif; text-align: center; }
      .state-button:enabled { background: #dbeafe; color: #1e3a8a; }
      .state-button:disabled { background: #e2e8f0; color: #475569; opacity: 0.55; }
      #state-enabled { left: 100px; }
      #state-disabled { left: 320px; }
      #state-checked { appearance: none; box-sizing: border-box; position: absolute; left: 550px; top: 126px; width: 32px; height: 28px; margin: 0; padding: 0; border: 2px solid #166534; border-radius: 4px; background: #fee2e2; }
      #state-checked:checked { background: #22c55e; }
      #state-checked:checked::after { content: ''; display: block; width: 19.2px; height: 19.2px; margin: 2.4px 4.4px; background: #ffffff; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '.state-button', boxSizing: 'border-box', position: 'absolute', top: '110px', width: '180px', height: '64px', margin: '0', padding: '16px', borderWidth: '0', background: '#fee2e2', color: '#7f1d1d', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '.state-button:enabled', background: '#dbeafe', color: '#1e3a8a' },
      { selector: '.state-button:disabled', background: '#e2e8f0', color: '#475569', opacity: '0.55' },
      { selector: '#state-enabled', left: '100px' },
      { selector: '#state-disabled', left: '320px' },
      { selector: '#state-checked', boxSizing: 'border-box', position: 'absolute', left: '550px', top: '126px', width: '32px', height: '28px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: '#166534', borderRadius: '4px', background: '#fee2e2' },
      { selector: '#state-checked:checked', background: '#22c55e' },
    ],
    root: {
      children: [
        { type: 'input', inputType: 'button', id: 'state-enabled', class: 'state-button', value: 'Enabled' },
        { type: 'input', inputType: 'button', id: 'state-disabled', class: 'state-button', value: 'Disabled', disabled: true },
        { type: 'input', inputType: 'checkbox', id: 'state-checked', checked: true },
      ],
    },
  },
};
