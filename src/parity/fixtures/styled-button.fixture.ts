import { ParityFixture } from '../parity.types';

export const styledButtonFixture: ParityFixture = {
  id: 'styled-button',
  title: 'Explicitly styled button',
  category: 'forms-interactive',
  expectedBehavior:
    'An explicitly styled button uses the declared border box, background, border, radius, and centered label without relying on native browser chrome.',
  measurementIds: ['styled-button'],
  reference: {
    html: '<input id="styled-button" type="button" value="Launch panel">',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #styled-button { appearance: none; box-sizing: border-box; position: absolute; left: 120px; top: 90px; width: 220px; height: 64px; margin: 0; padding: 12px 24px; border: 3px solid #1e3a8a; border-radius: 10px; background: #2563eb; color: #ffffff; font: 700 18px/24px Arial, sans-serif; text-align: center; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#styled-button', boxSizing: 'border-box', position: 'absolute', left: '120px', top: '90px', width: '220px', height: '64px', margin: '0', padding: '12px 24px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '10px', background: '#2563eb', color: '#ffffff', fontFamily: 'Arial', fontSize: '18px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
    ],
    root: {
      children: [{ type: 'input', inputType: 'button', id: 'styled-button', value: 'Launch panel' }],
    },
  },
};
