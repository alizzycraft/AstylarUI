import { ParityFixture } from '../parity.types';

export const styledTextInputFixture: ParityFixture = {
  id: 'styled-text-input',
  title: 'Explicitly styled text input',
  category: 'forms-interactive',
  expectedBehavior:
    'An explicitly styled text input uses the declared border box and renders its value with browser-like content insets.',
  measurementIds: ['styled-text-input'],
  reference: {
    html: '<input id="styled-text-input" type="text" value="Astylar search">',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #styled-text-input { appearance: none; box-sizing: border-box; position: absolute; left: 180px; top: 220px; width: 320px; height: 58px; margin: 0; padding: 10px 16px; border: 2px solid #475569; border-radius: 8px; background: #ffffff; color: #0f172a; font: 400 17px/24px Arial, sans-serif; text-align: left; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#styled-text-input', boxSizing: 'border-box', position: 'absolute', left: '180px', top: '220px', width: '320px', height: '58px', margin: '0', padding: '10px 16px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#475569', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial', fontSize: '17px', fontWeight: '400', lineHeight: '24px', textAlign: 'left' },
    ],
    root: {
      children: [{ type: 'input', inputType: 'text', id: 'styled-text-input', value: 'Astylar search' }],
    },
  },
};
