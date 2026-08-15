import { ParityFixture } from '../parity.types';

export const textOverflowEllipsisFixture: ParityFixture = {
  id: 'text-overflow-ellipsis',
  title: 'Single-line text overflow ellipsis',
  category: 'typography',
  expectedBehavior:
    'No-wrap text that exceeds a fixed content box is clipped and replaced by an ellipsis at the same glyph boundary as the browser.',
  measurementIds: ['ellipsis-text'],
  reference: {
    html: '<div id="ellipsis-text">Astylar renders a deliberately long navigation label</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff1f2; font-family: Arial, sans-serif; }
      #ellipsis-text { box-sizing: border-box; position: absolute; left: 130px; top: 140px; width: 280px; height: 54px; padding: 12px 14px; border: 2px solid #be123c; background: #ffe4e6; color: #881337; font-family: Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 26px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff1f2' },
      { selector: '#ellipsis-text', boxSizing: 'border-box', position: 'absolute', left: '130px', top: '140px', width: '280px', height: '54px', padding: '12px 14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#be123c', background: '#ffe4e6', color: '#881337', fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: '400', lineHeight: '26px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
    ],
    root: {
      children: [{ type: 'div', id: 'ellipsis-text', textContent: 'Astylar renders a deliberately long navigation label' }],
    },
  },
};
