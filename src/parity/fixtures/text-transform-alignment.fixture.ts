import { ParityFixture } from '../parity.types';

export const textTransformAlignmentFixture: ParityFixture = {
  id: 'text-transform-alignment',
  title: 'Text transform and right alignment',
  category: 'typography',
  expectedBehavior:
    'Text transformation affects measured and painted glyphs while right alignment uses the content box edge.',
  measurementIds: ['transformed-text'],
  reference: {
    html: '<div id="transformed-text">web parity state</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fefce8; font-family: Arial, sans-serif; }
      #transformed-text { box-sizing: border-box; position: absolute; left: 120px; top: 130px; width: 360px; height: 58px; padding: 12px 18px; border: 2px solid #a16207; background: #fef08a; color: #713f12; font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; line-height: 30px; text-align: right; text-transform: uppercase; white-space: nowrap; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fefce8' },
      { selector: '#transformed-text', boxSizing: 'border-box', position: 'absolute', left: '120px', top: '130px', width: '360px', height: '58px', padding: '12px 18px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#a16207', background: '#fef08a', color: '#713f12', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontWeight: '700', lineHeight: '30px', textAlign: 'right', textTransform: 'uppercase', whiteSpace: 'nowrap' },
    ],
    root: {
      children: [{ type: 'div', id: 'transformed-text', textContent: 'web parity state' }],
    },
  },
};
