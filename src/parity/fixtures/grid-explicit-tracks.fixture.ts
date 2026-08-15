import { ParityFixture } from '../parity.types';

export const gridExplicitTracksFixture: ParityFixture = {
  id: 'grid-explicit-tracks',
  title: 'Explicit grid tracks with gaps',
  category: 'grid',
  expectedBehavior:
    'Grid children auto-place in row order, stretch into explicit px/fr columns and rows, and preserve independent row and column gaps.',
  measurementIds: ['grid-shell', 'grid-a', 'grid-b', 'grid-c', 'grid-d'],
  reference: {
    html: `
      <div id="grid-shell">
        <div id="grid-a"></div><div id="grid-b"></div>
        <div id="grid-c"></div><div id="grid-d"></div>
      </div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #grid-shell { box-sizing: border-box; display: grid; grid-template-columns: 160px 1fr; grid-template-rows: 80px 100px; column-gap: 20px; row-gap: 20px; position: absolute; left: 150px; top: 100px; width: 500px; height: 240px; margin: 0; padding: 20px; border: 0; background: #e2e8f0; }
      #grid-shell > div { box-sizing: border-box; min-width: 0; min-height: 0; margin: 0; padding: 0; border: 0; }
      #grid-a { background: #2563eb; } #grid-b { background: #14b8a6; }
      #grid-c { background: #f97316; } #grid-d { background: #a855f7; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#grid-shell', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '160px 1fr', gridTemplateRows: '80px 100px', columnGap: '20px', rowGap: '20px', position: 'absolute', left: '150px', top: '100px', width: '500px', height: '240px', margin: '0', padding: '20px', borderWidth: '0', background: '#e2e8f0' },
      { selector: '#grid-shell > div', boxSizing: 'border-box', minWidth: '0', minHeight: '0', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#grid-a', background: '#2563eb' },
      { selector: '#grid-b', background: '#14b8a6' },
      { selector: '#grid-c', background: '#f97316' },
      { selector: '#grid-d', background: '#a855f7' },
    ],
    root: {
      children: [{
        type: 'div', id: 'grid-shell', children: [
          { type: 'div', id: 'grid-a' }, { type: 'div', id: 'grid-b' },
          { type: 'div', id: 'grid-c' }, { type: 'div', id: 'grid-d' },
        ],
      }],
    },
  },
};
