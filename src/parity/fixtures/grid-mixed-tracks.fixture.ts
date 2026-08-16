import { ParityFixture } from '../parity.types';

export const gridMixedTracksFixture: ParityFixture = {
  id: 'grid-mixed-tracks', title: 'Mixed three-column grid tracks', category: 'grid',
  expectedBehavior: 'Six items auto-place across two explicit rows with fixed and fractional columns plus independent row and column gaps.',
  measurementIds: ['mixed-grid', 'mixed-a', 'mixed-b', 'mixed-c', 'mixed-d', 'mixed-e', 'mixed-f'],
  reference: {
    html: `<div id="mixed-grid"><div id="mixed-a"></div><div id="mixed-b"></div><div id="mixed-c"></div><div id="mixed-d"></div><div id="mixed-e"></div><div id="mixed-f"></div></div>`,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #mixed-grid { box-sizing: border-box; display: grid; grid-template-columns: 120px 2fr 1fr; grid-template-rows: 90px 130px; column-gap: 18px; row-gap: 26px; position: absolute; left: 100px; top: 110px; width: 600px; height: 286px; padding: 20px; border: 0; background: #e2e8f0; }
      #mixed-grid > div { box-sizing: border-box; min-width: 0; min-height: 0; margin: 0; padding: 0; border: 0; }
      #mixed-a { background:#1d4ed8 } #mixed-b { background:#0f766e } #mixed-c { background:#7e22ce } #mixed-d { background:#ea580c } #mixed-e { background:#16a34a } #mixed-f { background:#ca8a04 }
    `,
  },
  siteData: { styles: [
    { selector: 'root', background: '#f8fafc' },
    { selector: '#mixed-grid', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '120px 2fr 1fr', gridTemplateRows: '90px 130px', columnGap: '18px', rowGap: '26px', position: 'absolute', left: '100px', top: '110px', width: '600px', height: '286px', padding: '20px', borderWidth: '0', background: '#e2e8f0' },
    { selector: '#mixed-grid > div', boxSizing: 'border-box', minWidth: '0', minHeight: '0', margin: '0', padding: '0', borderWidth: '0' },
    { selector: '#mixed-a', background:'#1d4ed8' }, { selector: '#mixed-b', background:'#0f766e' }, { selector: '#mixed-c', background:'#7e22ce' },
    { selector: '#mixed-d', background:'#ea580c' }, { selector: '#mixed-e', background:'#16a34a' }, { selector: '#mixed-f', background:'#ca8a04' },
  ], root: { children: [{ type:'div', id:'mixed-grid', children: ['a','b','c','d','e','f'].map(letter => ({ type:'div', id:`mixed-${letter}` })) }] } },
};
