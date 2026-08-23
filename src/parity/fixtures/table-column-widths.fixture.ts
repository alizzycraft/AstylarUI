import { ParityFixture } from '../parity.types';

export const tableColumnWidthsFixture: ParityFixture = {
  id: 'table-column-widths',
  title: 'Explicit table column widths',
  category: 'lists-tables-images',
  expectedBehavior:
    'Fixed table columns honor explicit pixel widths instead of being redistributed equally.',
  measurementIds: [
    'track-table',
    'track-row-one',
    'track-row-two',
    'track-cell-a',
    'track-cell-b',
    'track-cell-c',
    'track-cell-d',
  ],
  reference: {
    html: '<table id="track-table"><colgroup><col style="width: 120px"><col style="width: 240px"></colgroup><tbody><tr id="track-row-one"><td id="track-cell-a">Narrow</td><td id="track-cell-b">Wide column</td></tr><tr id="track-row-two"><td id="track-cell-c">One</td><td id="track-cell-d">Two</td></tr></tbody></table>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff7ed; font-family: Arial, sans-serif; color: #7c2d12; }
      #track-table { box-sizing: border-box !important; position: absolute; left: 180px; top: 330px; width: 360px; height: 140px; margin: 0; padding: 0; border: 0; border-spacing: 0; table-layout: fixed; background: #ffedd5; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #track-row-one, #track-row-two { margin: 0; padding: 0; border: 0; }
      #track-cell-a, #track-cell-b, #track-cell-c, #track-cell-d { box-sizing: border-box !important; margin: 0; padding: 0; border: 0; color: #7c2d12; vertical-align: middle; }
      #track-cell-a { background: #fed7aa; }
      #track-cell-b { background: #fdba74; }
      #track-cell-c { background: #fb923c; }
      #track-cell-d { background: #f97316; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff7ed', fontFamily: 'Arial, sans-serif', color: '#7c2d12' },
      { selector: '#track-table', position: 'absolute', left: '180px', top: '330px', width: '360px', height: '140px', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', background: '#ffedd5', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#track-row-one, #track-row-two', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none' },
      { selector: '#track-cell-a, #track-cell-b, #track-cell-c, #track-cell-d', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', color: '#7c2d12', verticalAlign: 'middle' },
      { selector: '#track-cell-a', background: '#fed7aa' },
      { selector: '#track-cell-b', background: '#fdba74' },
      { selector: '#track-cell-c', background: '#fb923c' },
      { selector: '#track-cell-d', background: '#f97316' },
    ],
    root: {
      children: [{
        type: 'table',
        id: 'track-table',
        children: [
          {
            type: 'colgroup',
            children: [
              { type: 'col', tableProperties: { width: '120px' } },
              { type: 'col', tableProperties: { width: '240px' } },
            ],
          },
          {
            type: 'tbody',
            children: [
              {
                type: 'tr',
                id: 'track-row-one',
                children: [
                  { type: 'td', id: 'track-cell-a', textContent: 'Narrow' },
                  { type: 'td', id: 'track-cell-b', textContent: 'Wide column' },
                ],
              },
              {
                type: 'tr',
                id: 'track-row-two',
                children: [
                  { type: 'td', id: 'track-cell-c', textContent: 'One' },
                  { type: 'td', id: 'track-cell-d', textContent: 'Two' },
                ],
              },
            ],
          },
        ],
      }],
    },
  },
};
