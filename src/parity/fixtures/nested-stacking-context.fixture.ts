import { ParityFixture } from '../parity.types';

export const nestedStackingContextFixture: ParityFixture = {
  id: 'nested-stacking-context',
  title: 'Child z-index remains inside parent stacking context',
  category: 'layering-overlays',
  expectedBehavior:
    'A high-z child inside a lower stacking context cannot paint above a sibling stacking context whose parent z-index is higher.',
  measurementIds: ['lower-context', 'escaped-layer', 'upper-context'],
  reference: {
    html: `
      <div id="lower-context"><div id="escaped-layer"></div></div>
      <div id="upper-context"></div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #lower-context { box-sizing: border-box; position: absolute; left: 140px; top: 120px; width: 300px; height: 220px; margin: 0; padding: 0; border: 0; z-index: 1; background: #dcfce7; }
      #escaped-layer { box-sizing: border-box; position: absolute; left: 110px; top: 60px; width: 260px; height: 160px; margin: 0; padding: 0; border: 0; z-index: 100; background: #ef4444; }
      #upper-context { box-sizing: border-box; position: absolute; left: 320px; top: 180px; width: 260px; height: 190px; margin: 0; padding: 0; border: 0; z-index: 2; background: #2563eb; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#lower-context', boxSizing: 'border-box', position: 'absolute', left: '140px', top: '120px', width: '300px', height: '220px', margin: '0', padding: '0', borderWidth: '0', zIndex: '1', background: '#dcfce7' },
      { selector: '#escaped-layer', boxSizing: 'border-box', position: 'absolute', left: '110px', top: '60px', width: '260px', height: '160px', margin: '0', padding: '0', borderWidth: '0', zIndex: '100', background: '#ef4444' },
      { selector: '#upper-context', boxSizing: 'border-box', position: 'absolute', left: '320px', top: '180px', width: '260px', height: '190px', margin: '0', padding: '0', borderWidth: '0', zIndex: '2', background: '#2563eb' },
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'lower-context',
          children: [{ type: 'div', id: 'escaped-layer' }],
        },
        { type: 'div', id: 'upper-context' },
      ],
    },
  },
};
