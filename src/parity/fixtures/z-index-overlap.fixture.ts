import { ParityFixture } from '../parity.types';

export const zIndexOverlapFixture: ParityFixture = {
  id: 'z-index-overlap',
  title: 'Overlapping positioned siblings by z-index',
  category: 'positioning-stacking',
  expectedBehavior:
    'A positioned sibling with the higher stylesheet z-index paints above a later DOM sibling throughout their overlap.',
  measurementIds: ['higher-layer', 'lower-layer'],
  reference: {
    html: '<div id="higher-layer"></div><div id="lower-layer"></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #higher-layer, #lower-layer { box-sizing: border-box; position: absolute; width: 240px; height: 180px; margin: 0; padding: 0; border: 0; }
      #higher-layer { left: 210px; top: 170px; z-index: 5; background: #ef4444; }
      #lower-layer { left: 150px; top: 120px; z-index: 1; background: #2563eb; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#higher-layer', boxSizing: 'border-box', position: 'absolute', left: '210px', top: '170px', width: '240px', height: '180px', margin: '0', padding: '0', borderWidth: '0', background: '#ef4444', zIndex: '5' },
      { selector: '#lower-layer', boxSizing: 'border-box', position: 'absolute', left: '150px', top: '120px', width: '240px', height: '180px', margin: '0', padding: '0', borderWidth: '0', background: '#2563eb', zIndex: '1' },
    ],
    root: {
      children: [
        { type: 'div', id: 'higher-layer' },
        { type: 'div', id: 'lower-layer' },
      ],
    },
  },
};
