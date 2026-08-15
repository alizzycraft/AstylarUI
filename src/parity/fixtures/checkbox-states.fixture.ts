import { ParityFixture } from '../parity.types';

export const checkboxStatesFixture: ParityFixture = {
  id: 'checkbox-states',
  title: 'Checked and disabled checkbox states',
  category: 'forms-interactive',
  expectedBehavior:
    'Explicitly styled checkboxes preserve independent width and height, initialize checked state visibly, and retain disabled opacity without invented labels.',
  measurementIds: ['checked-box', 'disabled-box'],
  reference: {
    html: `
      <input id="checked-box" type="checkbox" checked aria-label="Checked option">
      <input id="disabled-box" type="checkbox" disabled aria-label="Disabled option">
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #checked-box, #disabled-box { appearance: none; box-sizing: border-box; position: absolute; width: 28px; height: 24px; margin: 0; padding: 0; border: 2px solid #1e3a8a; border-radius: 5px; }
      #checked-box { left: 160px; top: 140px; background: #2563eb; }
      #checked-box::after { content: ''; display: block; width: 16.8px; height: 16.8px; margin: 1.6px 3.6px; background: #ffffff; }
      #disabled-box { left: 260px; top: 140px; background: #cbd5e1; opacity: 0.45; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#checked-box', boxSizing: 'border-box', position: 'absolute', left: '160px', top: '140px', width: '28px', height: '24px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '5px', background: '#2563eb' },
      { selector: '#disabled-box', boxSizing: 'border-box', position: 'absolute', left: '260px', top: '140px', width: '28px', height: '24px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '5px', background: '#cbd5e1', opacity: '0.45' },
    ],
    root: {
      children: [
        { type: 'input', inputType: 'checkbox', id: 'checked-box', checked: true },
        { type: 'input', inputType: 'checkbox', id: 'disabled-box', disabled: true },
      ],
    },
  },
};
