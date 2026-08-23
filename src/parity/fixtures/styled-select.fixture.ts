import { ParityFixture } from '../parity.types';

export const styledSelectFixture: ParityFixture = {
  id: 'styled-select',
  title: 'Styled semantic select control',
  category: 'forms-interactive',
  expectedBehavior:
    'A select element is recognized from its semantic type and paints its selected option at the declared content inset.',
  measurementIds: ['styled-select'],
  reference: {
    html: '<select id="styled-select"><option value="a">Alpha option</option><option value="b" selected>Beta option</option><option value="c">Gamma option</option></select>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f0fdf4; font-family: Arial, sans-serif; }
      #styled-select { appearance: none; box-sizing: border-box; position: absolute; left: 160px; top: 150px; width: 260px; height: 50px; margin: 0; padding: 8px 14px; border: 3px solid #166534; border-radius: 0; outline: 0; background: #bbf7d0; color: #14532d; font-family: Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 24px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdf4' },
      { selector: '#styled-select', boxSizing: 'border-box', position: 'absolute', left: '160px', top: '150px', width: '260px', height: '50px', margin: '0', padding: '8px 14px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#166534', borderRadius: '0', background: '#bbf7d0', color: '#14532d', fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: '400', lineHeight: '24px' },
    ],
    root: {
      children: [
        {
          type: 'select',
          id: 'styled-select',
          value: 'b',
          options: [
            { value: 'a', label: 'Alpha option' },
            { value: 'b', label: 'Beta option' },
            { value: 'c', label: 'Gamma option' },
          ],
        },
      ],
    },
  },
};
