import { ParityFixture } from '../parity.types';

export const tableFixedLayoutFixture: ParityFixture = {
  id: 'table-fixed-layout',
  title: 'Fixed table rows and columns',
  category: 'lists-tables-images',
  expectedBehavior:
    'A fixed-size two-by-two table divides its border-free grid evenly across rows and columns.',
  measurementIds: [
    'fixed-table',
    'fixed-body',
    'fixed-row-one',
    'fixed-row-two',
    'fixed-cell-a',
    'fixed-cell-b',
    'fixed-cell-c',
    'fixed-cell-d',
  ],
  reference: {
    html: '<table id="fixed-table"><tbody id="fixed-body"><tr id="fixed-row-one"><td id="fixed-cell-a">Alpha</td><td id="fixed-cell-b">Beta</td></tr><tr id="fixed-row-two"><td id="fixed-cell-c">Gamma</td><td id="fixed-cell-d">Delta</td></tr></tbody></table>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #faf5ff; font-family: Arial, sans-serif; color: #581c87; }
      #fixed-table { box-sizing: border-box !important; position: absolute; left: 220px; top: 120px; width: 360px; height: 160px; margin: 0; padding: 0; border: 0; border-spacing: 0; table-layout: fixed; background: #f3e8ff; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #fixed-body, #fixed-row-one, #fixed-row-two { margin: 0; padding: 0; border: 0; }
      #fixed-cell-a, #fixed-cell-b, #fixed-cell-c, #fixed-cell-d { box-sizing: border-box !important; margin: 0; padding: 0; border: 0; color: #581c87; vertical-align: middle; }
      #fixed-cell-a { background: #e9d5ff; }
      #fixed-cell-b { background: #d8b4fe; }
      #fixed-cell-c { background: #c084fc; }
      #fixed-cell-d { background: #a855f7; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#faf5ff', fontFamily: 'Arial, sans-serif', color: '#581c87' },
      { selector: '#fixed-table', position: 'absolute', left: '220px', top: '120px', width: '360px', height: '160px', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', background: '#f3e8ff', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#fixed-body, #fixed-row-one, #fixed-row-two', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none' },
      { selector: '#fixed-cell-a, #fixed-cell-b, #fixed-cell-c, #fixed-cell-d', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', color: '#581c87', verticalAlign: 'middle' },
      { selector: '#fixed-cell-a', background: '#e9d5ff' },
      { selector: '#fixed-cell-b', background: '#d8b4fe' },
      { selector: '#fixed-cell-c', background: '#c084fc' },
      { selector: '#fixed-cell-d', background: '#a855f7' },
    ],
    root: {
      children: [{
        type: 'table',
        id: 'fixed-table',
        children: [{
          type: 'tbody',
          id: 'fixed-body',
          children: [
            {
              type: 'tr',
              id: 'fixed-row-one',
              children: [
                { type: 'td', id: 'fixed-cell-a', textContent: 'Alpha' },
                { type: 'td', id: 'fixed-cell-b', textContent: 'Beta' },
              ],
            },
            {
              type: 'tr',
              id: 'fixed-row-two',
              children: [
                { type: 'td', id: 'fixed-cell-c', textContent: 'Gamma' },
                { type: 'td', id: 'fixed-cell-d', textContent: 'Delta' },
              ],
            },
          ],
        }],
      }],
    },
  },
};
