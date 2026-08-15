import { ParityFixture } from '../parity.types';

export const negativeAutoStackingFixture: ParityFixture = {
  id: 'negative-auto-stacking',
  title: 'Negative and auto stacking inside a context',
  category: 'positioning-stacking',
  expectedBehavior:
    'A negative z-index child paints above its stacking-context parent background but below a later auto-z sibling.',
  measurementIds: ['stack-context', 'negative-layer', 'auto-layer'],
  reference: {
    html: '<div id="stack-context"><div id="negative-layer"></div><div id="auto-layer"></div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #stack-context { box-sizing: border-box; position: absolute; z-index: 0; left: 150px; top: 90px; width: 360px; height: 230px; border: 4px solid #334155; background: #e2e8f0; }
      #negative-layer, #auto-layer { box-sizing: border-box; position: absolute; top: 44px; width: 190px; height: 130px; border: 4px solid; }
      #negative-layer { z-index: -1; left: 34px; border-color: #991b1b; background: #fca5a5; }
      #auto-layer { z-index: auto; left: 112px; border-color: #1e3a8a; background: #93c5fd; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#stack-context', boxSizing: 'border-box', position: 'absolute', zIndex: '0', left: '150px', top: '90px', width: '360px', height: '230px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#334155', background: '#e2e8f0' },
      { selector: '#negative-layer, #auto-layer', boxSizing: 'border-box', position: 'absolute', top: '44px', width: '190px', height: '130px', borderWidth: '4px', borderStyle: 'solid' },
      { selector: '#negative-layer', zIndex: '-1', left: '34px', borderColor: '#991b1b', background: '#fca5a5' },
      { selector: '#auto-layer', zIndex: 'auto', left: '112px', borderColor: '#1e3a8a', background: '#93c5fd' },
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'stack-context',
          children: [
            { type: 'div', id: 'negative-layer' },
            { type: 'div', id: 'auto-layer' },
          ],
        },
      ],
    },
  },
};
