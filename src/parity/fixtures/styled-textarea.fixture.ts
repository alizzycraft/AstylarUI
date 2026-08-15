import { ParityFixture } from '../parity.types';

export const styledTextareaFixture: ParityFixture = {
  id: 'styled-textarea',
  title: 'Styled semantic textarea control',
  category: 'forms-interactive',
  expectedBehavior:
    'A textarea is recognized from its semantic type and renders authored line breaks from the declared content inset.',
  measurementIds: ['styled-textarea'],
  reference: {
    html: '<textarea id="styled-textarea">First line\nSecond line</textarea>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fdf4ff; }
      #styled-textarea { appearance: none; box-sizing: border-box; position: absolute; left: 150px; top: 120px; width: 340px; height: 130px; margin: 0; padding: 12px 16px; border: 3px solid #86198f; border-radius: 0; outline: 0; resize: none; overflow: hidden; background: #fae8ff; color: #701a75; font-family: Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 28px; text-align: left; white-space: pre-wrap; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fdf4ff' },
      { selector: '#styled-textarea', boxSizing: 'border-box', position: 'absolute', left: '150px', top: '120px', width: '340px', height: '130px', margin: '0', padding: '12px 16px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#86198f', borderRadius: '0', background: '#fae8ff', color: '#701a75', fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: '400', lineHeight: '28px', textAlign: 'left', whiteSpace: 'pre-wrap' },
    ],
    root: {
      children: [{ type: 'textarea', id: 'styled-textarea', value: 'First line\nSecond line' }],
    },
  },
};
