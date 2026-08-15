import { ParityFixture } from '../parity.types';

export const textSpacingFixture: ParityFixture = {
  id: 'text-spacing',
  title: 'Letter and word spacing',
  category: 'typography',
  expectedBehavior:
    'Letter-spacing and word-spacing affect both painted glyph positions and the intrinsic width of an auto-sized inline box.',
  measurementIds: ['spaced-text'],
  reference: {
    html: '<span id="spaced-text">Web parity tools</span>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff7ed; }
      #spaced-text { box-sizing: border-box; position: absolute; left: 110px; top: 130px; width: auto; height: auto; margin: 0; padding: 6px 10px; border: 0; background: #fed7aa; color: #7c2d12; font-family: Arial, sans-serif; font-size: 20px; font-weight: 400; line-height: 28px; letter-spacing: 2px; word-spacing: 7px; white-space: nowrap; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff7ed' },
      { selector: '#spaced-text', display: 'inline-block', boxSizing: 'border-box', position: 'absolute', left: '110px', top: '130px', width: 'auto', height: 'auto', margin: '0', padding: '6px 10px', borderWidth: '0', background: '#fed7aa', color: '#7c2d12', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontWeight: '400', lineHeight: '28px', letterSpacing: '2px', wordSpacing: '7px', whiteSpace: 'nowrap' },
    ],
    root: {
      children: [{ type: 'span', id: 'spaced-text', textContent: 'Web parity tools' }],
    },
  },
};
